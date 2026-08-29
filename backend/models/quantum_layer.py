"""PennyLane 6-qubit variational quantum circuit with multi-basis measurement.

Architecture (thesis):
    * Angle embedding via RY gates (one feature per qubit).
    * Variational layers: parameterized RY + RZ, then CNOT entanglement
      (ring or all-to-all).
    * Measurement: expectation values in Pauli-Z, Pauli-X, and Pauli-Y.
      These are equivalent to computational-basis ``<Z>`` after a Hadamard
      prefix (X) and an Rx(π/2) prefix (Y), evaluated on the *same*
      variational state (not sequential mid-circuit measurements).
"""

from __future__ import annotations

from typing import Literal

import torch
import torch.nn as nn

try:
    import pennylane as qml
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        "PennyLane is required for the quantum layer. Install via `pip install pennylane`."
    ) from exc

Entanglement = Literal["ring", "all_to_all"]


def _select_qdevice(n_qubits: int) -> qml.Device:
    """Create a PennyLane device with GPU/CPU fallback.

    The thesis simulator is ``default.qubit``. Faster plugins are tried first
    when installed (``lightning.gpu``, ``lightning.qubit``).
    """
    candidates: list[str] = []
    if torch.cuda.is_available():
        candidates.append("lightning.gpu")
    candidates.extend(["lightning.qubit", "default.qubit"])

    last_error: Exception | None = None
    for name in candidates:
        try:
            return qml.device(name, wires=n_qubits)
        except Exception as err:
            last_error = err
            continue

    raise RuntimeError(
        f"Unable to initialize a PennyLane device for {n_qubits} qubits."
    ) from last_error


def _apply_ansatz(
    inputs: torch.Tensor,
    weights: torch.Tensor,
    n_qubits: int,
    entanglement: Entanglement,
) -> None:
    """Angle-encode features and apply variational entangling layers."""
    qml.AngleEmbedding(inputs, wires=range(n_qubits), rotation="Y")

    n_layers = int(weights.shape[0])
    for layer in range(n_layers):
        for wire in range(n_qubits):
            qml.RY(weights[layer, wire, 0], wires=wire)
            qml.RZ(weights[layer, wire, 1], wires=wire)

        if entanglement == "ring":
            for wire in range(n_qubits):
                qml.CNOT(wires=[wire, (wire + 1) % n_qubits])
        elif entanglement == "all_to_all":
            for src in range(n_qubits):
                for dst in range(src + 1, n_qubits):
                    qml.CNOT(wires=[src, dst])
        else:
            raise ValueError(f"Unknown entanglement pattern '{entanglement}'.")


def _diff_method_for(device: qml.Device) -> str:
    name = str(getattr(device, "name", "default.qubit")).lower()
    if "lightning" in name:
        return "adjoint"
    return "backprop"


class QuantumLayer(nn.Module):
    """Differentiable 6-qubit VQC returning concatenated multi-basis expectations.

    Output dimension is ``n_qubits * 3`` (Z, X, Y per qubit), matching a
    fully-connected head of ``in_features=measurement_dim``.
    """

    def __init__(
        self,
        n_qubits: int = 6,
        n_layers: int = 2,
        entanglement: Entanglement = "ring",
    ) -> None:
        super().__init__()
        if n_qubits < 1:
            raise ValueError("n_qubits must be >= 1.")
        if n_layers < 1:
            raise ValueError("n_layers must be >= 1.")

        self.n_qubits = n_qubits
        self.n_layers = n_layers
        self.entanglement: Entanglement = entanglement
        self.measurement_dim = n_qubits * 3

        self.qdevice = _select_qdevice(n_qubits)
        self.weights = nn.Parameter(0.01 * torch.randn(n_layers, n_qubits, 2))
        self._qnode = self._build_qnode()

    def _build_qnode(self) -> qml.QNode:
        n_qubits = self.n_qubits
        entanglement = self.entanglement

        @qml.qnode(
            self.qdevice,
            interface="torch",
            diff_method=_diff_method_for(self.qdevice),
        )
        def circuit(inputs: torch.Tensor, weights: torch.Tensor) -> list:
            _apply_ansatz(inputs, weights, n_qubits, entanglement)
            # Multi-basis: <Z>, <X> (Hadamard-equivalent), <Y> (Rx(π/2)-equivalent)
            observables = (
                [qml.expval(qml.PauliZ(w)) for w in range(n_qubits)]
                + [qml.expval(qml.PauliX(w)) for w in range(n_qubits)]
                + [qml.expval(qml.PauliY(w)) for w in range(n_qubits)]
            )
            return observables

        return circuit

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Map scaled angles ``(B, n_qubits)`` to expectations ``(B, 3n)``."""
        if x.ndim != 2 or x.shape[-1] != self.n_qubits:
            raise ValueError(
                f"QuantumLayer expected shape (batch, {self.n_qubits}), got {tuple(x.shape)}."
            )

        origin_device = x.device
        origin_dtype = x.dtype
        batch: list[torch.Tensor] = []

        # default.qubit / lightning expect float32; keep the autograd graph.
        features = x.to(dtype=torch.float32)
        weights = self.weights.to(dtype=torch.float32)

        try:
            for i in range(features.shape[0]):
                measured = self._qnode(features[i], weights)
                if not torch.is_tensor(measured):
                    measured = torch.stack(tuple(measured))
                batch.append(measured)
        except Exception as err:
            raise RuntimeError(f"Quantum circuit evaluation failed: {err}") from err

        stacked = torch.stack(batch, dim=0)
        return stacked.to(device=origin_device, dtype=origin_dtype)
