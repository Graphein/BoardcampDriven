export function handleErrors(err, req, res, next) {
    if (err.name === "ConflictError") return res.status(409).send(err.message);
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
  