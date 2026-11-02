import json
from pathlib import Path
import stat
import tempfile
import unittest

from pipeline.github import extract, normalize
from scripts.setup_keys import save_keys


class PreparationTests(unittest.TestCase):
    def test_links_merge_without_erasing_evidence(self):
        result = extract('<a href="https://github.com/Owner/Repo/tree/main">repo</a> '
                         'https://github.com/owner/repo.git '
                         'https://github.com/OWNER/REPO/issues/42?x=1&amp;y=2')
        self.assertEqual(list(result), ["owner/repo"])
        self.assertEqual(len(result["owner/repo"]), 3)

    def test_not_repository_links(self):
        for url in ["https://github.com/topics/python", "https://github.com/owner",
                    "https://github.com.evil.org/owner/repo", "https://github.com/login/oauth"]:
            self.assertIsNone(normalize(url))

    def test_sentence_punctuation(self):
        self.assertEqual(list(extract('Try (https://github.com/a/b).')), ["a/b"])

    def test_credentials_permissions_and_replacement(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / ".secrets/keys.json"
            save_keys(path, {"TYPESAFE_API_KEY": "synthetic-test-value"})
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
            self.assertEqual(stat.S_IMODE(path.parent.stat().st_mode), 0o700)
            save_keys(path, {"GITHUB_TOKEN": "synthetic-replacement"})
            self.assertEqual(json.loads(path.read_text()), {"GITHUB_TOKEN": "synthetic-replacement"})

    def test_credentials_reject_symlink(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            target = base / "target"
            target.mkdir()
            (base / "linked").symlink_to(target)
            with self.assertRaises(ValueError):
                save_keys(base / "linked/keys.json", {"key": "synthetic"})


if __name__ == "__main__":
    unittest.main()
