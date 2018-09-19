module.exports = function(RED){
    "use strict";

    function YoutubeDownload(n){
        RED.nodes.createNode(this, n);
        this.url = n.url;
        this.urlType = n.urlType;
        this.path = n.path;
        this.pathType = n.pathType;
        var Ytdl = require('ytdl-core');
        var Fs = require('fs');
        var Progress = require('progress-stream');
        var progressStream = Progress({time:500});

        this.status({});
        var node = this;

        this.on('input', function(msg){
            node.status({fill:"blue", shape:"ring", text:"Starting"});
            var path_ = msg.path;
            if(!path_){
              path_ = RED.util.evaluateNodeProperty(node.path, node.pathType, node, msg);
            }
            var url_ = msg.payload;
            if(!url_){
              url_ = RED.util.evaluateNodeProperty(node.url, node.urlType, node, msg);
            }

            if(!path_){
              node.status({fill:"red", shape:"ring", text:"No path provided"});
              return;
            }
            if(!url_){
              node.status({fill:"red", shape:"ring", text:"No url provided"});
              return;
            }

            if(!path_.endsWith("/")){
               path_+="/";
            }

            progressStream.on('progress', function(progress) {
                node.status({fill:"blue", shape:"ring", text:progress.percentage.toFixed(2) + "%"});
            });

            //default video
            var options = { filter: function(format) { return format.container === 'mp4'; } };
            var ext = "mp4";
            //audio only
            if(msg.audioonly){
              options =  { filter: 'audioonly'};
              ext = "mp3";
            }

            var download = function(url_, path_, options){
              var ytdl = Ytdl(url_, options);

              ytdl.on('response', function(response) {
                  progressStream.setLength( response.headers["content-length"] );
              });
              ytdl.pipe(progressStream).pipe(Fs.createWriteStream(path_))
              .on('finish', function(){
                  node.status({fill:"blue", shape:"dot", text:"Done"});
                  node.send(msg);
              })
              node.ytdl = ytdl;
            }

            //get info
            Ytdl.getInfo(url_, function(err, info) {
              //video title as file name
              msg.file = path_+info.title+"."+ext;
              download(url_, msg.file , options);
            });


        });

        this.on('close', function(){
            if(node.ytdl && node.ytdl.destroy)
                node.ytdl.destroy();
            if(progressStream && progressStream.destroy)
                progressStream.destroy();
        });
    }
    RED.nodes.registerType("youtube-download", YoutubeDownload);
}
