const ws = new WebSocket(`ws://${API_BASE_URL}/soulLink`);

window.onbeforeunload = () => ws.close();
export default ws;