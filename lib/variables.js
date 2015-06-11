(function() {
  var name, variables;

  variables = {
    OCR_LANGUAGE: "deu",
    OCR_DEBUG_WINDOW: 1,
    OCR_DEBUG_WINDOW_TIMEOUT: 500,
    OCR_WATCH_PATTERN: "*.tiff",
    OCR_RELATIVEAREAMINIMUM: 0.01,
    OCR_RELATIVEAREAMAXIMUM: 0.4,
    OCR_IMAGE_HEIGHT_SCALE: 1,
    OCR_IMAGE_WIDTH_SCALE: 1.8,
    OCR_ADDRESS_BLOCK_RATIO: 0.3,
    OCR_CODE_BLOCK_RATIO: 0.4,
    OCR_BC_NITERS: 20,
    OCR_BC_CANNY_THRESH_LOW: 0,
    OCR_BC_CANNY_THRESH_HIGH: 255,
    OCR_BC_MIN_NORMALIZE: 0,
    OCR_IMAGE_BIGHTNESS: 90,
    OCR_IMAGE_CONTRAST: 1.1,
    OCR_MIN_TEXTBLOCK_SIZE: 100,
    OCR_TEXT_NITERS: 80,
    OCR_TEXT_CANNY_THRESH_LOW: 10,
    OCR_TEXT_CANNY_THRESH_HIGH: 155,
    OCR_TEXT_MIN_NORMALIZE: 90,
    OCR_CROPPED_TEXT_MIN_NORMALIZE: 0,
    OCR_CROPPED_TEXT_MAX_NORMALIZE: 80,
    OCR_CROPPED_TEXT_CONTRAST: 1.0,
    OCR_CROPPED_TEXT_BIGHTNESS: 200,
    OCR_OVERDRAW_BARCODES: 1,
    OCR_IGNORE_STRING: "IIII:llll:mmm:nuvgn:vwvw:ii:oo:uu:Telefon:0361-43",
    OCR_DB_NAME: "sorter",
    OCR_DB_USER: "root",
    OCR_DB_PASSWORD: "",
    OCR_DB_HOST: "localhost",
    OCR_SOCKET_IO_HOST: "http://localhost:3000"
  };

  for (name in variables) {
    if (process.env[name] != null) {
      variables[name] = process.env[name];
    }
  }

  module.exports = variables;

}).call(this);
