import unittest

from electricitymap.contrib.config.model import CONFIG_MODEL


class ConfigModelTestcase(unittest.TestCase):
    def test_pydantic_model(self):
        self.assertIn("DK-BHM->SE", CONFIG_MODEL.exchanges.keys())
        self.assertIn("US-NW-PSCO", CONFIG_MODEL.zones.keys())
        self.assertIsNotNone(
            CONFIG_MODEL.zones["US-NW-PSCO"].parsers.get_function("production")
        )


if __name__ == "__main__":
    unittest.main(buffer=True)
