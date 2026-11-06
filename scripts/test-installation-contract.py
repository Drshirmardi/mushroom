"""Private application compatibility checks for the independently versioned installer."""
import argparse
from contextlib import redirect_stdout
import io
from pathlib import Path
import sys
import unittest

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--installer-root', type=Path, default=Path('.installer'))
args, remaining = parser.parse_known_args()
sys.path.insert(0, str(args.installer_root.resolve() / 'installation'))
import manager

REPOSITORY = Path(__file__).resolve().parent.parent


class ApplicationContractTests(unittest.TestCase):
    def test_actual_api_and_frontend_environment_contracts_are_covered(self):
        with redirect_stdout(io.StringIO()):
            manager.audit_environment(REPOSITORY)

    def test_production_compose_uses_external_database(self):
        compose = (REPOSITORY / 'compose.production.example.yaml').read_text(encoding='utf-8')
        self.assertNotIn('  postgres:', compose)


if __name__ == '__main__':
    unittest.main(argv=[sys.argv[0], *remaining])
