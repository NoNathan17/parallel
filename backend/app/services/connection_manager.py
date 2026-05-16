from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, simulation_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        if simulation_id not in self._connections:
            self._connections[simulation_id] = []
        self._connections[simulation_id].append(websocket)

    def disconnect(self, simulation_id: str, websocket: WebSocket) -> None:
        conns = self._connections.get(simulation_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            self._connections.pop(simulation_id, None)

    async def broadcast(self, simulation_id: str, event: dict[str, Any]) -> None:
        conns = self._connections.get(simulation_id, [])
        if not conns:
            return
        payload = json.dumps(event)
        dead: list[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(simulation_id, ws)


ws_manager = ConnectionManager()
