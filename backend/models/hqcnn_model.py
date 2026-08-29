"""Hybrid Quantum-Classical CNN (HQCNN) for binary TB classification from CXR.

Pipeline:
    CXR (B, 3, 224, 224)
      -> CNN backbone feature map
      -> 1x1 conv to 6 channels + AdaptiveAvgPool2d(1)
      -> scale to [0, π]
      -> 6-qubit VQC (multi-basis measurement)
      -> Linear(measurement_dim, 1) + Sigmoid
"""

from __future__ import annotations

import math
from typing import Any

import torch
import torch.nn as nn

from .backbone import (
    BackboneName,
    build_backbone,
    get_torch_device,
    resolve_module,
)
from .quantum_layer import Entanglement, QuantumLayer

INPUT_SIZE = 224
N_QUBITS = 6
DEFAULT_THRESHOLD = 0.5


class HQCNN(nn.Module):
    """End-to-end hybrid model: CNN extractor + PennyLane VQC + sigmoid head."""

    def __init__(
        self,
        backbone_name: BackboneName = "resnet50",
        *,
        pretrained: bool = True,
        n_qubits: int = N_QUBITS,
        n_qlayers: int = 2,
        entanglement: Entanglement = "ring",
        threshold: float = DEFAULT_THRESHOLD,
    ) -> None:
        super().__init__()
        if n_qubits != N_QUBITS:
            raise ValueError(f"Thesis HQCNN requires {N_QUBITS} qubits, got {n_qubits}.")
        if not 0.0 < threshold < 1.0:
            raise ValueError("threshold must be in (0, 1).")

        self.backbone_name: BackboneName = backbone_name
        self.n_qubits = n_qubits
        self.threshold = threshold

        extractor, out_channels, cam_target = build_backbone(
            backbone_name, pretrained=pretrained
        )
        self.backbone = extractor
        self.cam_target_path = cam_target
        self.out_channels = out_channels

        # Dimensionality reduction: 6 feature channels, then AdaptiveAvgPool2d.
        self.channel_reduce = nn.Conv2d(out_channels, n_qubits, kernel_size=1, bias=True)
        self.pool = nn.AdaptiveAvgPool2d(1)

        self.quantum = QuantumLayer(
            n_qubits=n_qubits,
            n_layers=n_qlayers,
            entanglement=entanglement,
        )
        self.head = nn.Linear(self.quantum.measurement_dim, 1)

        self._cam_target: nn.Module | None = None

    @property
    def cam_target_layer(self) -> nn.Module:
        """Final convolutional block of the selected backbone (Grad-CAM)."""
        if self._cam_target is None:
            self._cam_target = resolve_module(self.backbone, self.cam_target_path)
        return self._cam_target

    @staticmethod
    def scale_to_pi(features: torch.Tensor) -> torch.Tensor:
        """Map unconstrained pooled features to angle range [0, π]."""
        return math.pi * torch.sigmoid(features)

    def _validate_input(self, x: torch.Tensor) -> torch.Tensor:
        if not torch.is_tensor(x):
            raise TypeError("HQCNN expects a torch.Tensor image batch.")
        if x.ndim != 4:
            raise ValueError(f"Expected NCHW tensor with 4 dims, got shape {tuple(x.shape)}.")
        if x.shape[1] != 3 or x.shape[2] != INPUT_SIZE or x.shape[3] != INPUT_SIZE:
            raise ValueError(
                f"Expected input (B, 3, {INPUT_SIZE}, {INPUT_SIZE}), got {tuple(x.shape)}."
            )
        if torch.isnan(x).any() or torch.isinf(x).any():
            raise ValueError("Input tensor contains NaN or Inf values (corrupted image?).")
        return x

    def extract_quantum_features(self, x: torch.Tensor) -> torch.Tensor:
        """CNN features reduced to 6 angles in [0, π], shape ``(B, 6)``."""
        x = self._validate_input(x)
        fmap = self.backbone(x)
        reduced = self.channel_reduce(fmap)
        pooled = self.pool(reduced).flatten(1)
        return self.scale_to_pi(pooled)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Return TB-positive probabilities in ``(B, 1)`` after sigmoid."""
        angles = self.extract_quantum_features(x)
        measured = self.quantum(angles)
        logits = self.head(measured)
        return torch.sigmoid(logits)

    @torch.no_grad()
    def predict(
        self,
        x: torch.Tensor,
        *,
        threshold: float | None = None,
    ) -> dict[str, Any]:
        """Inference helper used by the Flask ``/api/predict`` route."""
        self.eval()
        cut = self.threshold if threshold is None else threshold
        probs = self.forward(x)
        labels = (probs >= cut).to(dtype=torch.int64)
        return {
            "probability": probs,
            "logit_proxy": torch.logit(probs.clamp(1e-6, 1 - 1e-6)),
            "label": labels,
            "threshold": cut,
            "class_name": ["TB-negative", "TB-positive"],
        }


def load_hqcnn(
    checkpoint_path: str | None = None,
    *,
    backbone_name: BackboneName = "resnet50",
    map_location: str | torch.device | None = None,
    **kwargs: Any,
) -> HQCNN:
    """Construct HQCNN and optionally load weights, with CPU fallback."""
    device = torch.device(map_location) if map_location is not None else get_torch_device()
    model = HQCNN(backbone_name=backbone_name, **kwargs)
    if checkpoint_path:
        try:
            state = torch.load(checkpoint_path, map_location=device)
        except Exception:
            state = torch.load(checkpoint_path, map_location="cpu")
            device = torch.device("cpu")
        if isinstance(state, dict) and "state_dict" in state:
            state = state["state_dict"]
        model.load_state_dict(state, strict=True)
    try:
        model = model.to(device)
    except RuntimeError:
        device = torch.device("cpu")
        model = model.to(device)
    model.eval()
    return model
