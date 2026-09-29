from pathlib import Path

from sentinel_simulator.cli import main
from sentinel_simulator.settings import feed_key


def test_the_environment_wins_over_the_file(tmp_path: Path):
    env = tmp_path / ".env"
    env.write_text("SENTINEL_FEED_KEY=from-the-file\n", encoding="utf-8")
    assert feed_key({"SENTINEL_FEED_KEY": "from-the-environment"}, [env]) == "from-the-environment"


def test_reads_the_key_from_the_repositorys_env_file(tmp_path: Path):
    env = tmp_path / ".env"
    env.write_text('# settings\nSENTINEL_DB_PORT=5433\nSENTINEL_FEED_KEY="quoted-key"\n', "utf-8")
    assert feed_key({}, [tmp_path / "missing", env]) == "quoted-key"


def test_is_none_when_set_nowhere(tmp_path: Path):
    assert feed_key({}, [tmp_path / ".env"]) is None


def test_refuses_to_start_without_a_key(capsys, monkeypatch, tmp_path):
    monkeypatch.delenv("SENTINEL_FEED_KEY", raising=False)
    monkeypatch.chdir(tmp_path)
    assert main(["--api-url", "http://127.0.0.1:9", "backfill", "--days", "1"]) == 2
    assert "SENTINEL_FEED_KEY" in capsys.readouterr().err
