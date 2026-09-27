import json
import threading
from datetime import UTC, datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest

from sentinel_simulator import client as client_module
from sentinel_simulator.client import ApiError, SentinelClient
from sentinel_simulator.generator import SimulatedReport

FACILITIES = [
    {
        "code": "LKY0001016",
        "name": "Peradeniya",
        "districtCode": "KDY",
        "category": "HOSPITAL",
        "institutionType": "Teaching",
        "latitude": 7.266279,
        "longitude": 80.597654,
    },
    {
        "code": "LKY0001008",
        "name": "Kandy",
        "districtCode": "KDY",
        "category": "HOSPITAL",
        "institutionType": "Teaching",
        "latitude": None,
        "longitude": None,
    },
]


class FakeApi(BaseHTTPRequestHandler):
    """Answers as the Sentinel API does, and remembers what it was sent."""

    protocol_version = "HTTP/1.1"
    received: list = []
    connections: set = set()

    def do_GET(self):
        FakeApi.connections.add(self.client_address)
        self._reply(200, FACILITIES)

    def do_POST(self):
        FakeApi.connections.add(self.client_address)
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        facility = self.headers.get("X-Facility-Code")
        FakeApi.received.append((facility, body))
        if facility == "LXX9999999":
            self._reply(403, {"detail": "No registered facility has this code."})
        elif "latitude" in body and body["latitude"] > 10:
            self._reply(
                400,
                {
                    "detail": "The request has invalid fields.",
                    "errors": [{"field": "latitude", "message": "must be at most 10.0"}],
                },
            )
        else:
            self._reply(202, {"reportId": "0b6f7d3c-1e7f-4c55-9a8e-0f1c2d3e4f50"})

    def _reply(self, status, payload):
        data = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


@pytest.fixture
def api():
    FakeApi.received = []
    FakeApi.connections = set()
    server = ThreadingHTTPServer(("127.0.0.1", 0), FakeApi)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{server.server_address[1]}"
    server.shutdown()
    server.server_close()


def report(facility="LKY0001016", latitude=7.2663):
    return SimulatedReport(
        facility_code=facility,
        symptom_group="DENGUE_LIKE",
        reported_at=datetime(2026, 9, 27, 4, 30, tzinfo=UTC),
        age=37,
        date_of_birth=None,
        latitude=latitude,
        longitude=80.5977,
        patient_name="SIMULATED patient 000001",
        nic_number="SIMULATED-000001",
        phone_number="SIMULATED-0000000000",
        home_address="SIMULATED address 000001, KDY",
    )


def test_reads_the_facility_registry(api):
    with SentinelClient(api) as client:
        facilities = client.facilities()
    assert [f.code for f in facilities] == ["LKY0001016", "LKY0001008"]
    assert facilities[0].latitude == 7.266279
    assert facilities[1].latitude is None


def test_submits_a_report_as_its_facility(api):
    with SentinelClient(api) as client:
        receipt = client.submit(report())
    assert receipt["reportId"]
    [(facility, body)] = FakeApi.received
    assert facility == "LKY0001016"
    assert body["symptomGroup"] == "DENGUE_LIKE"
    assert body["reportedAt"] == "2026-09-27T10:00:00+05:30"
    assert "facilityCode" not in body


def test_reuses_one_connection_for_many_requests(api):
    with SentinelClient(api) as client:
        client.facilities()
        for _ in range(5):
            client.submit(report())
    assert len(FakeApi.connections) == 1


def test_replaces_a_connection_left_idle(api, monkeypatch):
    with SentinelClient(api) as client:
        client.submit(report())
        monkeypatch.setattr(client_module, "MAX_IDLE_SECONDS", -1.0)
        client.submit(report())
    assert len(FakeApi.connections) == 2


def test_an_unknown_facility_is_an_api_error_with_the_apis_words(api):
    with SentinelClient(api) as client, pytest.raises(ApiError) as error:
        client.submit(report(facility="LXX9999999"))
    assert error.value.status == 403
    assert error.value.detail == "No registered facility has this code."


def test_a_rejected_field_is_named_in_the_error(api):
    with SentinelClient(api) as client, pytest.raises(ApiError) as error:
        client.submit(report(latitude=12.5))
    assert error.value.status == 400
    assert "latitude must be at most 10.0" in error.value.detail


def test_refuses_a_url_that_is_not_http():
    with pytest.raises(ValueError):
        SentinelClient("localhost:8080")
