"""Per-request simulation emitter context (LangGraph stream writer)."""

from __future__ import annotations

from contextvars import ContextVar
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.simulation.emitter import SimulationEmitter

_emitter_var: ContextVar[SimulationEmitter | None] = ContextVar("simulation_emitter", default=None)


def set_emitter(emitter: SimulationEmitter) -> None:
    _emitter_var.set(emitter)


def get_emitter() -> SimulationEmitter | None:
    return _emitter_var.get()


def clear_emitter() -> None:
    _emitter_var.set(None)
