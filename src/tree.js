define([
  'require',
  'jquery',
  'RemoteStorage',
  './common'
], function(require, $, RemoteStorage, common) {

  remoteStorage = new RemoteStorage();
  console.log('remoteStorage: ', remoteStorage);

  var parentPath = RemoteStorage.util.containingFolder;
  var isDir = RemoteStorage.util.isFolder;

  function jumpTo() {
    if(! common) {
      common = require('./common');
    }
    common.jumpTo.apply(common, arguments);
  }

  remoteStorage.access.claim('*', 'rw');
  var root = remoteStorage.scope('/');

  // root.on('conflict', function(conflict) {
  //   if(conflict.path == '/.open-trees') {
  //     conflict.resolve('local');
  //   }
  // });

  function pathParts(path) {
    if(! path) {
      console.trace();
    }
    var parts = path.split('/');
    return isDir(path) ? parts.slice(1, -1) : parts.slice(1);
  }

  function findDirLi(path) {
    return $('li.dir[data-path="' + path + '"]');
  }

  function buildDirNode(path, item) {
    var li = $('<li>');
    li.addClass('dir');
    li.attr('data-path', path);
    li.append($('<span class="expand icon-none"></span>'));
    li.append($('<span class="name"></span>').text(item));
    if($('#directory-tree').attr('data-current') == path) {
      li.addClass('current');
    }
    return li;
  }

  function loadChildren(path) {
    var parentLi = findDirLi(path);
    clearLoading(path, parentLi);
    var parentElement = parentLi.find('> ul');
    var iconElement = parentLi.find('> .expand');

    if(! parentElement) {
      console.error("Failed to find parent for: " + path);
      return;
    }

    root.getListing(path).then(function(items) {
      if (!items || Object.keys(items).length === 0) { return }

      var itemList = Object.keys(items).sort();

      var hasIcon = false;

      itemList.forEach(function(itemName) {
        var itemPath = path + itemName;

        if(isDir(itemPath) && findDirLi(itemPath).length === 0) {
          if(! hasIcon) {
            iconElement.removeClass('icon-none');
            iconElement.addClass('icon-chevron-right');
            hasIcon = true;
          }
          parentElement.append(buildDirNode(itemPath, itemName));
        }
      });
    });
  }


  function openTree(li) {
    var path = li.attr('data-path');
    if(! path) {
      return;
    }
    root.getListing(path).then(function(listing) {
      if(listing.length === 0) {
        return;
      }
      expandDir(path);
      loadChildren(path);
    });
  }

  function closeTree(li) {
    var path = li.attr('data-path')
    collapseDir(path);
  }


  function expandDir(path) {
    var li = findDirLi(path);
    var expander = li.find('> span.expand');
    expander.removeClass('icon-chevron-right');
    expander.addClass('icon-chevron-down');
    li.addClass('expanded');
    li.append($('<ul class="nav">'));
  }

  function collapseDir(path) {
    var li = findDirLi(path);
    var expander = li.find('> span.expand');
    expander.removeClass('icon-chevron-down');
    expander.addClass('icon-chevron-right');
    li.removeClass('expanded');
    li.find('> ul').remove();
  }

  function isDirExpanded(path) {
    var li = findDirLi(path);
    return (li && li.hasClass('expanded'));
  }

  function openDirUpto(path) {
    var parts = pathParts(path);
    var p = '/';
    while(parts.length > 0) {
      p += parts.shift() + '/';
      if(! isDirExpanded(p)) {
        openTree(findDirLi(p));
      }
    }
  }

  function clearLoading(path, li) {
    if(! li) {
      li = findDirLi(path);
    }
    li.find('> ul em.loading').remove();
  }

  function setLoading(path) {
    var li = findDirLi(path);

    li.find('> ul').append('<em class="loading">Loading...</em>');
  }

  function selectDirectory(path) {
    $('#directory-tree li.current').removeClass('current');
    var parent = parentPath(path) || '/';
    if(! isDirExpanded(parent)) {
      openDirUpto(parent);
    }
    var li = findDirLi(path);
    li.addClass('current');
    $('#directory-tree').attr('data-current', path);
  }

  function refresh() {
    loadChildren('/');
    loadChildren('/public/');
  }

  $('#directory-tree li .name').live('click', function(event) {
    var path = $(event.target).closest('li.dir').attr('data-path');
    jumpTo(path);
  });

  $('#directory-tree li > .expand').live('click', function(event) {
    var li = $(event.target).closest('li.dir');
    if($(event.target).hasClass('icon-chevron-right')) {
      openTree(li);
    } else {
      closeTree(li);
    }
  });

  return {
    setLoading: setLoading,
    open: openTree,
    select: selectDirectory,
    refresh: refresh
  }

});
