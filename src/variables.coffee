
variables =
  OCR_LANGUAGE: "deu"
  OCR_DEBUG: 0
  OCR_DEBUG_WINDOW: 0
  OCR_DEBUG_TIMEOUT: 15000
  OCR_NITERS: 30
  OCR_WATCH_PATTERN: "*.tiff"
  OCR_RELATIVEAREAMINIMUM: 0.01
  OCR_RELATIVEAREAMAXIMUM: 0.1
  OCR_CANNY_THRESH_LOW: 200
  OCR_CANNY_THRESH_HIGH: 255
  OCR_IMAGE_HEIGHT_SCALE: 1
  OCR_IMAGE_WIDTH_SCALE: 1.6
  OCR_ADDRESS_BLOCK_RATIO: 0.3
  OCR_CODE_BLOCK_RATIO: 0.4
  OCR_MIN_TEXTBLOCK_SIZE: 100
  OCR_OVERDRAW_BARCODES: 1
  OCR_IGNORE_STRING: "IIII:llll:mmm:nuvgn:vwvw:ii:oo:uu:Telefon:0361-43"
  OCR_DB_NAME: "sorter"
  OCR_DB_USER: "root"
  OCR_DB_PASSWORD: ""
  OCR_DB_HOST: "localhost"
  OCR_SOCKET_IO_HOST: "http://localhost:3000"


(variables[name] = process.env[name] for name in variables when process.env[name]? )

module.exports = variables
