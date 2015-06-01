var cv = require('opencv');
var fs = require('fs');
var path = require('path');
var glob = require('glob');
var wocr = require('wocr').OCR;
var socket = require('socket.io-client');
var classes = require('./main');
var variables = require('./variables').variables;
var xocr = new wocr();
xocr.Init(variables.OCR_LANGUAGE);



var GREEN = [0, 255, 0]; // B, G, R
var WHITE = [255, 255, 255]; // B, G, R
var RED   = [0, 0, 255]; // B, G, R
var YELLOW   = [0, 255, 255]; // B, G, R
var YELLOW   = [0, 255, 255]; // B, G, R
var C1   = [255, 255, 10]; // B, G, R

var xMove = 0;
var yMove = 0;
var debug = (variables.OCR_DEBUG+""==='0') ? false:true;
var debug_window = (variables.OCR_DEBUG_WINDOW+""==='0') ? false:true;
var colors = [GREEN,WHITE,RED,YELLOW,C1];


var path_name="";
var good_read="";
var bad_read="";
var unclear_read="";


var show = function(name,image){
  if (debug_window===true){
    var window = new cv.NamedWindow(name, 0);
    var out = image.clone();
    out.resize(image.width() ,image.height() );
    window.show(out);
    window.moveWindow(xMove,yMove);
    xMove+=100;
    yMove+=10;
    window.blockingWaitKey(0, 50);
  }
}
var contourRanking = function(a,b){
  return ( a.abs<b.abs )?1: ( ( a.abs>b.abs )?-1:0 );
}

var barcode = function(image,original){
  var lowThresh = parseInt(variables.OCR_CANNY_THRESH_LOW);
  var highThresh = parseInt(variables.OCR_CANNY_THRESH_HIGH);
  var nIters = parseInt(variables.OCR_NITERS);
  var imageArea = image.width() * image.height();
  var relativeAreaMinimum = parseFloat(variables.OCR_RELATIVEAREAMINIMUM);
  var relativeAreaMaximum = parseFloat(variables.OCR_RELATIVEAREAMAXIMUM);
  var codeBlockRatio = parseFloat(variables.OCR_CODE_BLOCK_RATIO);;

  var codes = [];
  var fulltext = "";

  var im_canny = image.copy();

  im_canny.normalize(0,255);
  /*
  if (debug){
    show('CANNY CONTOURS Barcode Normalize',im_canny);
  }
  */


  im_canny.canny(lowThresh, highThresh);
  im_canny.dilate(nIters);

  im_canny.canny(lowThresh, highThresh);
  contours = im_canny.findContours();
  var sorts = [];
  for(i = 0; i < contours.size(); i++) {
    var rect = contours.boundingRect(i);
    var relativeArea = rect.width*rect.height/imageArea;
    if (relativeArea > relativeAreaMinimum && relativeArea < relativeAreaMaximum){
      sorts.push({
        index: i,
        rect: rect,
        area: rect.width*rect.height,
        relativeArea: relativeArea,
        ratio: Math.min(rect.width,rect.height) / Math.max(rect.width,rect.height),
        abs: Math.abs( Math.min(rect.width,rect.height) / Math.max(rect.width,rect.height) - codeBlockRatio )
      });
      original.rectangle([rect.x+nIters,rect.y+nIters],[rect.width-2*nIters,rect.height-2*nIters],colors[i%colors.length],5);
      original.putText("C"+i,rect.x+rect.width/2,rect.y+rect.height/2,"HERSEY_SIMPLEX",colors[i%colors.length]);
      original.putText( rect.width*rect.height/imageArea ,rect.x+rect.width/2,rect.y+rect.height/2 + 40,"HERSEY_SIMPLEX",colors[i%colors.length]);
      original.putText( "A "+Math.abs( Math.min(rect.width,rect.height) / Math.max(rect.width,rect.height) - codeBlockRatio) ,rect.x+rect.width/2,rect.y+rect.height/2 + 80,"HERSEY_SIMPLEX",colors[i%colors.length]);
    }
  }

  sorts.sort(contourRanking);
  var lastrect;
  var result=[];
  for(var i=sorts.length-1;i>-1;i--){
    if ( JSON.stringify(sorts[i].rect,null,0) === lastrect ){
    }else{
      result.push(sorts[i]);
    }
    lastrect = JSON.stringify(sorts[i].rect,null,0);
  }
  sorts = result.reverse();

  if (debug){
    console.time("detecting codes");
  }
  result = [];
  for(var i=0;i< sorts.length;i++){
    var r = sorts[i].rect;
    var cropped = image.crop(r.x,r.y,r.width,r.height);
    xocr.SetMatrix(cropped);
    var imagecodes  = xocr.GetBarcode();
    if (imagecodes.length > 0){
      //console.log('found code at ',i);
      result.push(sorts[i].rect);
    }else{


    }
    codes = codes.concat(i25_remove_check(imagecodes));
  }

/*
  if (debug){
    show('BARCODE DEBUG',original);
  }
  */
  if(codes.length===0){
    if (debug){
      console.log("sry, was not able to find any barcode block, trying the hole image");
    }
    xocr.SetMatrix(image);
    codes = xocr.GetBarcode();
  }
  if (debug){
    console.timeEnd("detecting codes");
  }
  return {
    codes: codes,
    areas: result
  };
}

var toBeIgnored = function(text){
  var list = variables.OCR_IGNORE_STRING.toLowerCase().split(':');
  var t = text.toLowerCase();
  for(var i =0;i<list.length;i++){
    if (t.indexOf(list[i])>-1){
      return true;
    }
  }
  return false;
}

var text = function(image,original){
  var lowThresh = parseInt(variables.OCR_CANNY_THRESH_LOW);
  var highThresh = parseInt(variables.OCR_CANNY_THRESH_HIGH);
  var nIters = parseInt(variables.OCR_NITERS);
  var imageArea = image.width() * image.height();
  var relativeAreaMinimum = parseFloat(variables.OCR_RELATIVEAREAMINIMUM);
  var relativeAreaMaximum = parseFloat(variables.OCR_RELATIVEAREAMAXIMUM);
  var addressBlockRatio = parseFloat(variables.OCR_ADDRESS_BLOCK_RATIO);
  var minTextBlockSize = parseInt(variables.OCR_MIN_TEXTBLOCK_SIZE);
  var codes_result = barcode(image,original.clone());
  var codes = codes_result.codes;
  var fulltext = "";



  if (parseInt(variables.OCR_OVERDRAW_BARCODES)===1){
    for(var i=0;i<codes_result.areas.length;i++){
      var item = codes_result.areas[i];
      image.rectangle([item.x, item.y, item.width, item.height], [255,255,255,], -1);
      original.rectangle([item.x, item.y, item.width, item.height], [255,255,255,], -1);
    }
  }
  //im_canny.
  var im_canny = image.copy();

  im_canny.canny(lowThresh, highThresh);
  im_canny.dilate(nIters);

/*
  if (debug){
    show('CANNY CONTOURS',im_canny);
  }
*/
  im_canny.canny(lowThresh, highThresh);
  contours = im_canny.findContours();
  var sorts = [];
  for(i = 0; i < contours.size(); i++) {
    var rect = contours.boundingRect(i);
    var relativeArea = rect.width*rect.height/imageArea;
    if (relativeArea > relativeAreaMinimum && relativeArea < relativeAreaMaximum){
      sorts.push({
        index: i,
        rect: rect,
        area: rect.width*rect.height,
        relativeArea: relativeArea,
        ratio: Math.min(rect.width,rect.height) / Math.max(rect.width,rect.height),
        abs: Math.abs( Math.min(rect.width,rect.height) / Math.max(rect.width,rect.height) - addressBlockRatio)
      });
      original.rectangle([rect.x+nIters,rect.y+nIters],[rect.width-2*nIters,rect.height-2*nIters],colors[i%colors.length],5);
      original.putText("C"+i,rect.x+rect.width/2,rect.y+rect.height/2,"HERSEY_SIMPLEX",colors[i%colors.length]);
      original.putText( rect.width*rect.height/imageArea ,rect.x+rect.width/2,rect.y+rect.height/2 + 40,"HERSEY_SIMPLEX",colors[i%colors.length]);
      original.putText( "A "+Math.abs( Math.min(rect.width,rect.height) / Math.max(rect.width,rect.height) - addressBlockRatio) ,rect.x+rect.width/2,rect.y+rect.height/2 + 80,"HERSEY_SIMPLEX",colors[i%colors.length]);
    }
  }

  sorts.sort(contourRanking);

  var lastrect;
  var result=[];
  for(var i=sorts.length-1;i>-1;i--){
    if ( JSON.stringify(sorts[i].rect,null,0) === lastrect ){
    }else{
      if (sorts[i].rect.width>minTextBlockSize){
        if (sorts[i].rect.height>minTextBlockSize){
          result.push(sorts[i]);
        }
      }

    }
    lastrect = JSON.stringify(sorts[i].rect,null,0);
  }
  sorts = result.reverse();
  //console.log(sorts,addressBlockRatio);

  if (sorts.length>0){
    if (debug){
      console.time("detecting text");
    }


    var index = 0;
    var lines = 100;
    var numbers = "";
    var text_results = [];
    while( (index < sorts.length) ){
      var r = sorts[index].rect;
      var cropped = image.crop(r.x,r.y,r.width,r.height);
      cropped.rotate(270);
      /*
      var x_canny = cropped.clone();
      //cropped.normalize(10,155);
      x_canny.canny(lowThresh, highThresh);
      var x_contours = x_canny.findContours();
      //console.log(x_contours.size(),'Contours');
      if (x_contours.size() > 20){
      */
        xocr.SetMatrix(cropped);
        fulltext = xocr.GetText();
        //numbers = xocr.GetNumbers();
        fulltext = fulltext.replace(/\n\n/gm,"\n");
        lines = fulltext.split("\n").length;
        if (toBeIgnored(fulltext)){
          //seems to be a barcode
          //lines = 100;
        }else if (fulltext.replace(/\n/gm,"\n").trim()===''){
          //seems to be nothing
          lines = 100;
        }else if ( (lines>3) && (lines<10) ){
          text_results.push(fulltext);
        }
      /*}else{
        //console.log(x_contours.size(),'Contours SKIPPED');
      }
      */
      index++;
    }

    if (debug){
      //show('Address-Candidate',cropped);
      /*
      console.log('used index',index);
      if (index>1){
        console.log('sorry i did more than one turn');
        //console.log('fixing OCR_ADDRESS_BLOCK_RATIO should help ratio found',sorts[index].abs,' your setup is ',addressBlockRatio);
      }
      console.log('lines',fulltext.split("\n").length);
      */
      console.timeEnd("detecting text");
    }
  }
  if (debug){
    show('CANNY CONTOURS DEBUG',original);
  }
  return {
    codes: codes,
    text: text_results
  };
}

var i25_remove_check = function(arr){
  for(var i=0;i<arr.length;i++){
    if (arr[i].type==='I2/5'){
      var sym = (arr[i].code.substring(0,arr[i].code.length-1).split('')).reverse();
      var sum = 0;
      for(var j=0;j<sym.length;j+=2){
        sum += parseInt(sym[j])*3;
        if (j+1<sym.length){
          sum += parseInt(sym[j+1]);
        }
      }

      if( (10 - sum%10) === parseInt(arr[i].code.substring(arr[i].code.length-1)) ){
        arr[i].code =sym.reverse().join('');
      }
    }
  }
  return arr;
}

var ocr = function(filename,cb){
  cv.readImage(filename, function(err, im) {
    if (err){
      cb(err)
    }else{
      im.resize(im.width()* parseFloat(variables.OCR_IMAGE_WIDTH_SCALE),im.height()* parseFloat(variables.OCR_IMAGE_HEIGHT_SCALE));
      var original=im.clone();
      im.convertGrayscale();
      var res = text(im,original);
      var item,i=0;
      if (res.text){
        while( (i<res.text.length) && ( (item = extract(res.text[i])) === false ) ){
          i++;
        }
      }
      res.item = item;
      cb(null,res);
    }
  })
}

var extract = function(text){
  var plz = '';
  var i,found;
  var textLines = text.split("\n");

  //console.log(numbers,fulltext);
  var matches = text.match(/\b\d{5}\b/g);
  if (matches == null){
    return false;
  }
  if (matches.length>0){
    plz = matches[matches.length -1];
    i=textLines.length-1;
    while(i>=0){
      if (textLines[i].indexOf(plz)>=0){
        found=true;
        break;
      }
      i--;
    }
    if (found){
      var town = textLines[i].replace(plz,'').trim();
      var p = [];

      i--;
      while (i>=0){
        if (textLines[i].trim()!==''){
          p =  textLines[i].trim().split(' ');
          break;
        }
        i--;
      }

      j=i;
      var nameLines = [];
      while (j>=0){
        if (textLines[j].trim()!==''){
          nameLines.push( textLines[j].trim() );
        }
        if (nameLines.length==2){
          break;
        }
        j--;
      }

      var name = nameLines.reverse().join(' ');
      var hn = p.pop();
      if (hn!=='' && p.length===0){
        p.push(hn);
        hn="";
      }
      var f = p.join(' ') + ' ' + hn +  ' ' + plz + ' ' + town;
      return {
        zipCode: plz,
        town: town,
        houseNumber: hn,
        street: p.join(' '),
        name: name
      };
      //f = f.push(plz);
      //f = f.push( fulltextLines[i].replace(plz,'').trim() );
      //dbc.findText( f,hn );

    }
  }
  return false;
}

var dbc = new classes.DBClient();
dbc.start(variables.OCR_DB_NAME,variables.OCR_DB_USER,variables.OCR_DB_PASSWORD,variables.OCR_DB_HOST);


var watch = function(pathName,goodRead,badRead,unclearRead){


  if (typeof pathName==='string'){
    path_name = pathName;
  }
  if (typeof goodRead==='string'){
    good_read = goodRead;
  }
  if (typeof badRead==='string'){
    bad_read = badRead;
  }
  if (typeof unclearRead==='string'){
    unclear_read = unclearRead;
  }
  var pattern = variables.OCR_WATCH_PATTERN;
  glob(pattern,{
    cwd: path_name
  },function(err,matches){


    watchList(matches,0,function(){
      setTimeout(function(){
        watch();
      },2000);
    })
  })
}
var io = socket(variables.OCR_SOCKET_IO_HOST);
var watchList = function(matches,index,cb){
  if (io.connected){
    if (index<matches.length){
      ocr(path.join(path_name,matches[index]),function(err,res){
        if (err) throw err;
        if (res.codes.length>0){


          if ((typeof res.item === 'undefined') || (res.item === false)){

            log("debug","ocr watch",path.join(path_name,matches[index])+' bad read');

            fs.rename(path.join(path_name,matches[index]), path.join(bad_read,matches[index]), function(err){
              watchList(matches,index+1,cb);
            });

          }else{
            //console.log(res);
            log("debug","ocr watch",path.join(path_name,matches[index])+' good read');
            dbc.findText( res.item.street+' '+res.item.zipCode+' '+res.item.town, res.item.houseNumber ,function(err,result){
              if (err) throw err;
              if (result.length===1){
                //console.log(res.item.street+ ' '+res.item.houseNumber+' '+res.item.zipCode+' '+res.item.town, 'SG ' + result[0].sortiergang + ' SF ' + result[0].sortierfach);

                io.emit('new',{
                  codes: res.codes,
                  item: res.item,
                  sortresult: result[0]
                });

                fs.rename(path.join(path_name,matches[index]), path.join(good_read,matches[index]), function(err){
                  watchList(matches,index+1,cb);
                });
              }else{
                fs.rename(path.join(path_name,matches[index]), path.join(unclear_read,matches[index]), function(err){
                  watchList(matches,index+1,cb);
                });
              }
            });
          }
        }else{
          log("debug","ocr watch",path.join(path_name,matches[index])+' bad read');

          fs.rename(path.join(path_name,matches[index]), path.join(bad_read,matches[index]), function(err){
            watchList(matches,index+1,cb);
          });
        }
      });
    }else{
      log("info","ocr watch","no images");
      cb(null,true);
    }
  }else{
    //log("error","ocr watch","socket is not connected");
    cb(null,true);
  }


  return;

/*
  if (!socket.connected){
    console.log('SOCKET not connected');
    cb(null,true);
  }else{

  }
  */
}


exports.ocr = ocr;
exports.watch = watch;
