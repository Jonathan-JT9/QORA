"""
HQCNN (Hybrid Quantum-Classical Convolutional Neural Network) Module
End-to-End PyTorch Architecture for Tuberculosis Radiograph Classification
"""

from typing import Any, Dict, Optional, Tuple, Union

import torch
import torch.nn as nn

from .backbone import CXRBackboneExtractor, get_supported_backbones
from .quantum_layer import QuantumCircuitConfig, QuantumLayer


class HQCNNModel(nn.Module):
    """
    Hybrid Quantum-Classical Convolutional Neural Network (HQCNN) for CXR Analysis.

    Pipeline:
    1. Input Radiograph: (B, 3, 224, 224)
    2. Deep CNN Feature Extractor: ResNet50 / ConvNeXt-Small / EfficientNet-B4
    3. Spatial Pooling + Linear Projector + Angle Scaler -> 6 Features in [0, pi]
    4. 6-Qubit Parameterized Quantum Circuit (VQC) with Ring CNOT Entanglement
    5. Multi-Basis Expectation Readout (Pauli-Z, Pauli-X, Pauli-Y) -> 18 Quantum Features
    6. Classification Linear Layer -> Logit & Sigmoid Probability
    """

    def __init__(
        self,
        backbone_name: str = "resnet50",
        pretrained_backbone: bool = True,
        n_qubits: int = 6,
        n_quantum_layers: int = 3,
        threshold: float = 0.50
    ):
        super().__init__()
        self.backbone_name = backbone_name
        self.n_qubits = n_qubits
        self.threshold = threshold

        # 1. Classical Backbone & Dimensionality Reduction
        self.backbone = CXRBackboneExtractor(
            backbone_name=backbone_name,
            pretrained=pretrained_backbone,
            latent_quantum_dim=n_qubits
        )

        # 2. Parameterized Quantum Circuit Layer
        q_config = QuantumCircuitConfig(
            n_qubits=n_qubits,
            n_layers=n_quantum_layers,
            diff_method="best"
        )
        self.quantum_layer = QuantumLayer(config=q_config)

        # 3. Final Classification Head
        # Maps 18 multi-basis quantum expectations (6 Z + 6 X + 6 Y) to single binary logit
        self.classifier = nn.Sequential(
            nn.Linear(self.quantum_layer.output_dim, 16),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(16, 1)
        )

        self._init_classifier_weights()

    def _init_classifier_weights(self) -> None:
        """Initializes linear classifier weights for stable clinical gradient propagation."""
        for m in self.classifier.modules():
            if isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0.0)

    def forward(
        self,
        x: torch.Tensor,
        return_intermediates: bool = False
    ) -> Union[torch.Tensor, Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]]:
        """
        Forward pass.

        Args:
            x: Input radiograph tensor of shape (batch_size, 3, 224, 224)
            return_intermediates: If True, returns (logits, probabilities, angles, feature_maps)

        Returns:
            Logits tensor of shape (batch_size, 1) or full tuple if return_intermediates is True.
        """
        # Step 1: Classical feature extraction & angle scaling -> (B, 6), (B, C, H, W)
        angles, feature_maps = self.backbone(x)

        # Step 2: Quantum VQC execution -> (B, 18)
        quantum_features = self.quantum_layer(angles).to(dtype=angles.dtype)

        # Step 3: Classification readout -> (B, 1)
        logits = self.classifier(quantum_features)
        probs = torch.sigmoid(logits)

        if return_intermediates:
            return logits, probs, angles, feature_maps, quantum_features

        return logits

    def predict_sample(
        self,
        x: torch.Tensor,
        custom_threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Runs detailed inference on a single radiograph sample and returns structured metrics.

        Args:
            x: Tensor of shape (1, 3, 224, 224) or (3, 224, 224)
            custom_threshold: Optional override for sensitivity threshold (default 0.50)

        Returns:
            Dictionary containing prediction outcome, probability, confidence,
            quantum circuit measurements, and activation states.
        """
        self.eval()
        thresh = custom_threshold if custom_threshold is not None else self.threshold

        if x.ndim == 3:
            x = x.unsqueeze(0)

        with torch.no_grad():
            logits, probs, angles, feature_maps, q_feats = self.forward(x, return_intermediates=True)

            prob_val = float(probs[0, 0].item())
            logit_val = float(logits[0, 0].item())
            is_tb_positive = prob_val >= thresh
            confidence = prob_val if is_tb_positive else (1.0 - prob_val)

            # Inspect quantum layer breakdown
            q_inspection = self.quantum_layer.inspect_measurements(angles[0])

            return {
                "prediction": "TB Positive" if is_tb_positive else "Normal / Non-TB",
                "label_code": 1 if is_tb_positive else 0,
                "tb_probability": round(prob_val, 4),
                "confidence_score": round(confidence * 100.0, 2),
                "logit": round(logit_val, 4),
                "threshold_applied": thresh,
                "backbone_name": self.backbone_name,
                "quantum_circuit": {
                    "n_qubits": self.n_qubits,
                    "measurement_bases": ["Pauli-Z", "Pauli-X", "Pauli-Y"],
                    "output_dimension": 18,
                    **q_inspection
                }
            }


def create_hqcnn_model(
    backbone_name: str = "resnet50",
    pretrained: bool = True,
    threshold: float = 0.50,
    device: Optional[torch.device] = None
) -> HQCNNModel:
    """
    Factory function to instantiate and prepare an HQCNN model.
    """
    model = HQCNNModel(
        backbone_name=backbone_name,
        pretrained_backbone=pretrained,
        n_qubits=6,
        n_quantum_layers=3,
        threshold=threshold
    )
    if device is not None:
        model = model.to(device)
    return model
