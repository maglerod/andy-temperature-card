# andy-temperature-card
Andy Temperature Card is a sleek Lovelace custom card that visualizes a numeric sensor value as a modern thermometer.
It supports configurable min/max scaling, optional tick marks, optional Min/Avg/Max statistics (via Home Assistant history), and powerful color styling through value intervals.

![Preview Cold](images/temperature_card_1.png)
![Preview Hot](images/temperature_card_2.png)
![Preview VisualEditor](images/temperature_card_edit.png)



Key features:
- Thermometer visualization with a clean, modern look
- Numeric entities (works with any entity whose state is a number)
- Configurable value placement (top/bottom/inside)
- Intervals with per-range styling
-- Solid fill color or optional gradient
-- Per-interval outline color
- Optional glass effect
- Optional scale ticks (locked/consistent geometry)
- Optional Min/Avg/Max statistics (lookback hours configurable)
- Built-in visual editor UI (no YAML required, but supported)

Notes:
The stats feature uses the REST history endpoint via hass.callApi("GET", "history/period/...").
Runs fully in the browser (no backend).

