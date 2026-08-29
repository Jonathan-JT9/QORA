"""CNN backbone extractors for HQCNN (ResNet50, ConvNeXt-Small, EfficientNet-B4)."""

from __future__ import annotations

from typing import Literal

import torch
import torch.nn as nn

try:
    import timm
except ImportError as exc:  # pragma: no cover
    raise ImportError("timm is required for QORA backbones. Install via `pip install timm`.") from exc

BackboneName = Literal["resnet50", "convnext_small", "efficientnet_b4"]

SUPPORTED_BACKBONES: tuple[str, ...] = ("resnet50", "convnext_small", "efficientnet_b4")

# Final convolutional block used by Grad-CAM (timm feature extractor names).
CAM_TARGET_MODULE: dict[str, str] = {
    "resnet50": "layer4",
    "convnext_small": "stages.3",
    "efficientnet_b4": "blocks.6",
}


def get_torch_device() -> torch.device:
    """Prefer CUDA when a GPU is available; otherwise CPU."""
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def build_backbone(
    name: BackboneName,
    *,
    pretrained: bool = True,
) -> tuple[nn.Module, int, str]:
    """Build a TIMM feature extractor without classification head or global pool.

    Returns:
        extractor: Module mapping ``(B, 3, 224, 224)`` -> ``(B, C, H, W)``.
        out_channels: Channel count ``C`` of the final feature map.
        cam_target: Dotted module path of the last conv block (Grad-CAM).
    """
    key = name.lower().strip()
    if key not in SUPPORTED_BACKBONES:
        raise ValueError(
            f"Unsupported backbone '{name}'. Choose one of {SUPPORTED_BACKBONES}."
        )

    extractor = timm.create_model(
        key,
        pretrained=pretrained,
        num_classes=0,
        global_pool="",
    )
    out_channels = int(extractor.num_features)
    cam_target = CAM_TARGET_MODULE[key]
    return extractor, out_channels, cam_target


def resolve_module(root: nn.Module, dotted_path: str) -> nn.Module:
    """Resolve a nested submodule from a dotted path (e.g. ``stages.3``)."""
    module: nn.Module = root
    for part in dotted_path.split("."):
        if part.isdigit():
            module = module[int(part)]  # type: ignore[index]
        else:
            module = getattr(module, part)
    return module
