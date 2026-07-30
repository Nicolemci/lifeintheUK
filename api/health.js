module.exports = function health(_request, response) {
  return response.status(200).json({
    ok: true,
    service: "life-in-the-uk-prep",
  });
};
