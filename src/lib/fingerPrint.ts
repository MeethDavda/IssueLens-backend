const hashing = require("crypto");

function fingerPrint(req) {
  const components = [
    req.headers["x-forwareded-for"] || "",
    req.headers["user-agent"] || "",
    req.headers["accept-language"] || "",
    req.headers["accept-encoding"] || "",
  ];
  const fingerPrintString = components.join("|");
  return hashing.createHash("sha256").update(fingerPrintString).digest("hex");
}

module.exports = { fingerPrint };
