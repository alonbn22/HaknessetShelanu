import { test } from "node:test";
import assert from "node:assert/strict";
import { commonsFilePage, licenseUrl } from "../../src/lib/text";

// The member page links each photo to its Commons file page and its license
// deed; both links are derived, so derive them right.

test("commonsFilePage: the file page behind an upload URL, thumbnail or not", () => {
  const page = "https://commons.wikimedia.org/wiki/File:Dudi_Amsalem_2.jpg";
  assert.equal(
    commonsFilePage("https://upload.wikimedia.org/wikipedia/commons/8/85/Dudi_Amsalem_2.jpg?utm_source=commons.wikimedia.org"),
    page,
  );
  assert.equal(
    commonsFilePage("https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Dudi_Amsalem_2.jpg/500px-Dudi_Amsalem_2.jpg"),
    page,
  );
  assert.equal(commonsFilePage("https://example.org/wikipedia/commons/8/85/X.jpg"), null);
  assert.equal(commonsFilePage(null), null);
});

test("licenseUrl: Creative Commons short names → their deeds; public domain has none", () => {
  assert.equal(licenseUrl("CC BY-SA 4.0"), "https://creativecommons.org/licenses/by-sa/4.0/");
  assert.equal(licenseUrl("CC BY 2.0"), "https://creativecommons.org/licenses/by/2.0/");
  assert.equal(licenseUrl("CC BY-SA 2.5"), "https://creativecommons.org/licenses/by-sa/2.5/");
  assert.equal(licenseUrl("CC0"), "https://creativecommons.org/publicdomain/zero/1.0/");
  assert.equal(licenseUrl("Public domain"), null);
  assert.equal(licenseUrl(null), null);
});
