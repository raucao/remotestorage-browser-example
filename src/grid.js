
define([
  'require',
  'jquery',
  'RemoteStorage',
  './common'
], function(require, jquery, RemoteStorage, _common) {

  const remoteStorage = new RemoteStorage();

  var util = RemoteStorage.util;
  remoteStorage.access.claim('*', 'rw');
  var root = remoteStorage.scope('/');

  function common() {
    if(! _common) {
      _common = require('./common');
    }
    return _common;
  }

  function jumpTo() {
    common().jumpTo.apply(common(), arguments);
  }

  function pathParts(path) {
    var parts = path.split('/');
    return util.isFolder(path) ? parts.slice(1, -1) : parts.slice(1);
  }

  function setTitle(title) {
    $('title').text(title);
  }

  function openPath(path, extra) {
    var baseName = util.baseName(path);
    if(util.isFolder(path)) {
      setTitle("Browse: " + baseName);
      openDirectory(path, extra);
    } else {
      setTitle("File: " + baseName);
      openFile(path, extra);
    }
  }

  function makeBreadcrumbs(path) {
    var ul = $('<ul class="breadcrumb">');
    var divider = '<span class="divider">/</span>';
    var parts = pathParts(path);
    if(parts[0] == 'public') {
      parts.shift();
      ul.append('<a href="#!/public/" class="nav-header">public</a>&nbsp;');
    } else {
      ul.append('<a href="#!/" class="nav-header">private</a>&nbsp;');
    }
    ul.append(divider);
    parts.slice(0, -1).forEach(function(part, i) {
      var li = $('<li>'), p = '/' + parts.slice(0, i + 1).join('/') + '/';
      li.append($('<a>').attr('href', '#!' + p).text(part))
      li.append(divider);
      ul.append(li);
    });
    ul.append($('<li class="active">').text(parts.slice(-1)[0]));
    if(util.isFolder(path) && parts.length > 0) {
      ul.append(divider);
    }
    return ul;
  }

  function sortKeys(keys) {
    return keys.sort(function(a, b) {
      var aDir = util.isFolder(a);
      var bDir = util.isFolder(b);
      if(aDir && !bDir) {
        return -1;
      } else if(bDir && !aDir) {
        return 1;
      } else {
        return a > b ? 1 : (b > a ? -1 : 0);
      }
    });
  }

  function loadTable(path) {

    $('#content').html('');

    var btnGroup = $('<div class="btn-group"></div>');
    if(path != '/') {
      btnGroup.append(makeButton("back", "Back", "icon-arrow-left"));
    }
    btnGroup.append(makeButton("new", "New File", "icon-plus"));

    $('#content').append(makeBreadcrumbs(path));

    $('#content').append(btnGroup);

    var loading = $('<em>Loading...</em>');
    $('#content').append(loading);

    // FIXME: sync once here!!!

    loading.remove();

    var table = $('<table class="table table-striped dir-listing">');
    table.attr('data-path', path);
    var titleRow = $('<tr>');
    titleRow.append('<th></th>');
    titleRow.append('<th>Name</th>');
    table.append(titleRow);
    $('#content').append(table);

    var tbody = $('<tbody>');
    table.append(tbody);

    root.getObject(path).
      then(function(items) {

        function renderRow(key)  {
          var row = $('<tr>');
          row.attr('data-path', path + key);
          row.append($('<td>').append($('<span>').addClass(util.isFolder(path + key) ? 'icon-folder-open' : 'icon-file')));
          row.append($('<td class="name">').text(key));
          return row;
        }

        if(! items) {
          if(path != '/') {
            common().jumpTo(util.containingFolder(path));
          } else {
            throw("BUG: root node doesn't exist.");
          }
          return;
        }
        var keys = sortKeys(Object.keys(items));
        for(var i in keys) {
          var key = keys[i];

          if(path == '/' && key == 'public/') { continue; }

          tbody.append(renderRow(key));
        }
      });
  }

  function openDirectory(path) {
    loadTable(path);
  }

  function makeButton(action, label, icon) {
    var btn = $('<button>');
    btn.attr('data-action', action);
    btn.addClass('btn');
    btn.html('&nbsp;'+label);
    btn.prepend($('<span>').addClass(icon));
    return btn;
  }

  function inputRow(label, name, value, type) {
    var row = $('<div>').addClass('input');
    row.append($('<label>').text(label + ':'));
    row.append($('<input>').attr('name', name).attr('type', type).val(value));
    return row;
  }

  function displayForm(path, data, mimeType) {
    var text = (typeof(data) == 'string') ? data : JSON.stringify(data, undefined, 2);
    var form = $('<form id="editor">').attr('data-path', path);
    var filename = util.isFolder(path) ? '' : util.baseName(path);
    
    form.append(inputRow('Filename', 'filename', filename, 'text'));
    form.append(inputRow('MIME type', 'mimeType', mimeType, 'text'));

    form.append($('<label>Data</label>'));
    form.append($('<textarea name="data">').attr('value', text));

    $('#content').append(form);
    adjustButtons();

    // focus input (filename for new files, otherwise data)
    setTimeout(function() {
      var f = form[0];
      if(f.filename.value == '') {
        f.filename.focus();
      } else {
        f.data.focus();
      }
    });
  }

  function displayImage(path, data, mimeType) {
    var src;
    if(path.match(/^\/public\//)) {
      src = root.getItemURL(path);
    } else {
      var view = new Uint8Array(data);
      var blob = new Blob([view], { type: mimeType });
      src = common().createObjectURL(blob);
    }
    var img = $('<img>')
      .attr('src', src)
      .attr('data-path', path);
    $('#content').append(img);
  }

  function makeTab(label, path, name, activeMode) {
    return $('<li>')
      .addClass(activeMode == name ? 'active' : '')
      .append(
        $("<a>")
          .text(label)
          .attr('href', '#!' + path + '!' + name)
      );
  }

  function openFile(path, mode) {
    $('#content').html('');

    $('#content').append(makeBreadcrumbs(path));

    function itemLoaded(item) {
      console.debug('item:', item);

      var btnGroup = $('<div class="btn-group"></div>');
      btnGroup.append(makeButton("back", "Back", "icon-arrow-left"));
      btnGroup.append(makeButton("save", "Save", "icon-ok"));
      if(item.data) {
        btnGroup.append(makeButton("reset", "Reset", "icon-remove"));
        btnGroup.append(makeButton("destroy", "Destroy", "icon-trash"));
      }

      $('#content').append(btnGroup);
      $('#content').append($('<div id="notice-container">'));

      if(item.contentType.match(/^image\/.*/)) {
        displayImage(path, item.data, item.contentType);
      } else {
        displayForm(path, item.data, item.contentType, mode);
      }
    }

    if(util.isFolder(path)) {
      // new file
      itemLoaded({ data: '', mimeType: '' });
    } else {
      root.getFile(path).then(itemLoaded);
    }
  }

  $('#content table tbody td').live('click', function(event) {
    var path = $(event.target).closest('tr').attr('data-path');
    if(path) {
      jumpTo(path);
    }
  });

  function adjustButtons() {
    $('#content button[data-action="save"]').attr(
      'disabled',
      $('#content input[name="filename"]').val().length == 0
    );
  }

  // MOVE UP THE TREE
  $('#content button[data-action="back"]').live('click', function() {
    var container = $('#content form');
    if(container.length == 0) {
      container = $('#content table');
    }
    if(container.length == 0) {
      container = $('#content img');
    }
    path = container.attr('data-path');

    jumpTo(util.containingFolder(path) || '/');
  });

  function showNotice(message, actions) {
    var notice = $('<div>').addClass('notice');
    notice.append(message);
    var actionsDiv = $('<div>');
    for(var key in actions) {
      var link = $('<a href="#">');
      var handler = actions[key];
      link.text(key);
      link.bind('click', function(event) {
        event.preventDefault();
        handler();
        return false;
      });
      actionsDiv.append(link);
    }
    notice.append(actionsDiv);
    $('#content #notice-container').append(notice);
  }

  function closeNotice() {
    $('#notice-container').html('');
  }

  function disableAllActions() {
    $('#content button[data-action]').attr('disabled', true);
  }

  // WATCH FILENAME CHANGES
  $('#content input[name="filename"]').live('blur', function() {
    adjustButtons();
  });

  // NEW FILE
  $('#content button[data-action="new"]').live('click', function() {
    openFile($('#content table').attr('data-path'));
  });

  // RESET FORM
  $('#content button[data-action="reset"]').live('click', function() {
    var form = $('#content form')[0];
    
    var currentMime = $(form.mimeType).val();
    var currentData = $(form.data).val();
    $(form.mimeType).val(form.mimeType.getAttribute('value'));
    $(form.data).val(form.data.getAttribute('value'));
    showNotice("Form reset to inital values.", {
      undo: function() {
        $(form.mimeType).val(currentMime);
        $(form.data).val(currentData);
        closeNotice();
      },
      close: closeNotice
    });
  });

  // SAVE FILE
  $('#content button[data-action="save"]').live('click', function() {
    var form = $('#content form');
    var path = form.attr('data-path');
    var baseName = util.baseName(path);

    var fileName = $(form[0].filename).val();
    var mimeType = $(form[0].mimeType).val();
    var data = $(form[0].data).val();

    if(mimeType === 'application/json') {
      try {
        JSON.parse(data)
      } catch(exc) {
        console.log("Invalid JSON data: " + data);
        return;
      }
    }

    if(util.isFolder(path)) {
      baseName = fileName;
      path += baseName;
    }

    var newPath = path.replace(new RegExp(baseName + '$'), '') + fileName;
    console.log('storing file. path is', path, 'newPath is', newPath);
    root.storeFile(mimeType, newPath, data, false).
      then(function() {
        if(newPath !== path) {
          return root.remove(path);
        }
      }).
      then(function() {
        jumpTo(util.containingFolder(newPath));
      });
  });

  // DESTROY FILE
  $('#content button[data-action="destroy"]').live('click', function() {
    var path = $('#content form').attr('data-path') || $('#content img').attr('data-path');

    if(! path) {
      alert("BUG: failed to determine path to destroy.");
      return;
    }

    disableAllActions();

    root.remove(path).then(function() {
      jumpTo(util.containingFolder(path));
    });
  });

  return {
    openPath: openPath
  }

});

