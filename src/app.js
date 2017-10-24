define([
  'jquery',
  'bootstrap',
  'RemoteStorage',
  'Widget',
  './common',
  './tree',
  './settings'
], function($, _ignored, RemoteStorage, Widget, common, tree, settings) {

  const remoteStorage = new RemoteStorage();
  remoteStorage.enableLog();

  remoteStorage.setApiKeys({
    googledrive: '76638044554.apps.googleusercontent.com'
  });

  $(function() {

    remoteStorage.access.claim('*', 'rw');

    const widget = new Widget(remoteStorage);
    widget.attach();

    tree.setLoading('/');
    tree.setLoading('/public/');

    var ready = false;

    remoteStorage.on('ready', function() {
      ready = true;

      $(document.body).addClass('connected');
      try {
      tree.refresh();
      } catch(exc) { console.error('exc', exc.stack); }
    });

    remoteStorage.on('disconnected', function() {
      $(document.body).removeClass('connected');
    });

    remoteStorage.on('not-connected', function() {
      $(document.body).removeClass('connected');
    });

    $(window).bind('popstate', function() {
      var md = document.location.hash.match(/^#!(.+?)(?:!(.+)|)$/);
      var action;
      if(md) {
        console.log("DISPATCH", 'path', md[1], 'extra', md[2]);
        if(md[1][0] == '!') {
          action = function() { settings.display(md[1].slice(1)); };
        } else {
          action = function() { common.openPath(md[1], md[2]); };
        }
      } else {
        action = function() { common.jumpTo('/'); };
      }
      if(ready) {
        action();
      } else {
        remoteStorage.on('ready', action);
      }
    });
    
  });

});

