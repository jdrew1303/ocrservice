# ocrservice

[![Build Status](https://secure.travis-ci.org/tualo/ocrservice.png)](http://travis-ci.org/tualo/ocrservice)
[![endorse](https://api.coderwall.com/thomashoffmann1979/endorsecount.png)](https://coderwall.com/thomashoffmann1979)

This package is a part of services for letter sorting machine. Ocrservice is the ocr part, you can install it as systemd service. It will watch a directory for new images files. It scanns all that images an sends the results to the master service via websocket.

## Install

```
npm install forever -g
npm install ocrservice -g
```



## Usage

Installing a systemd service.

```
ocrservice install myservicename /my/image/path/
```

or as init.d script

```
ocrservice install --type init myservicename /my/image/path/
```

You can install/run more than one service. So it is possible to try a second run with different parameters. To see all parameters run.


```
ocrservice variables
```

The *systemd* service reads that variables from /etc/sysconfig/myservicename. The init.d script keeps that variables inside.

##debian notes

See [https://thomashunter.name/blog/running-a-node-js-process-on-debian-as-an-init-d-service/]
