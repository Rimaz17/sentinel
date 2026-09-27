import pytest

from sentinel_detector.config import ConfigError, connection_settings, read_env_file

ENV = {
    "SENTINEL_DB_URL": "jdbc:postgresql://localhost:5433/sentinel",
    "SENTINEL_DB_USERNAME": "sentinel",
    "SENTINEL_DB_PASSWORD": "secret",
}


def test_turns_the_apis_jdbc_url_into_a_libpq_one():
    assert connection_settings(ENV, env_files=[]) == {
        "conninfo": "postgresql://localhost:5433/sentinel",
        "user": "sentinel",
        "password": "secret",
    }


def test_falls_back_to_an_env_file(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "# local settings\n\n" + "\n".join(f"{k}={v}" for k, v in ENV.items()) + "\n",
        encoding="utf-8",
    )
    assert connection_settings({}, env_files=[env_file])["password"] == "secret"


def test_the_environment_wins_over_the_file(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text("\n".join(f"{k}={v}" for k, v in ENV.items()), encoding="utf-8")
    settings = connection_settings({"SENTINEL_DB_PASSWORD": "from-env"}, env_files=[env_file])
    assert settings["password"] == "from-env"


def test_a_later_env_file_wins_as_it_does_for_the_api(tmp_path):
    here, root = tmp_path / "here.env", tmp_path / "root.env"
    here.write_text("\n".join(f"{k}={v}" for k, v in ENV.items()), encoding="utf-8")
    root.write_text("SENTINEL_DB_PASSWORD=root", encoding="utf-8")
    assert connection_settings({}, env_files=[here, root])["password"] == "root"


def test_quotes_around_a_value_are_removed(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text("A=\"quoted value\"\nB='single'\nC=plain=with=equals\n", encoding="utf-8")
    assert read_env_file(env_file) == {"A": "quoted value", "B": "single", "C": "plain=with=equals"}


def test_names_every_missing_setting():
    with pytest.raises(ConfigError, match="SENTINEL_DB_USERNAME, SENTINEL_DB_PASSWORD"):
        connection_settings({"SENTINEL_DB_URL": ENV["SENTINEL_DB_URL"]}, env_files=[])


def test_refuses_a_url_that_is_not_postgresql():
    with pytest.raises(ConfigError, match="jdbc:postgresql"):
        connection_settings({**ENV, "SENTINEL_DB_URL": "jdbc:mysql://localhost/x"}, env_files=[])
