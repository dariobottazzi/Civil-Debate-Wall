/**
 * JoinDebateView
 */
window.JoinDebateView = Backbone.View.extend({
  tagName: 'div',
  className: 'join-debate',
  template: _.template($('#join-debate-template').html()),
  
  events: {
  	"click a.next": "nextStep",
  	"click a.prev": "prevStep",
  	"click a.close-btn": "onCloseClick",
  },
  
  initialize: function() {
  	this.currentStep = 0;
  },
  
  render: function() {
  	var data = this.model.toJSON();
  	data.question = models.currentQuestion.get('text');
  	$(this.el).html(this.template(data));
  	this.gotoStep(1);
  	return this
  },
  
  onCloseClick: function(e) {
    e.preventDefault();
    this.remove();
  },
  
  /**
   * Go to the next step in the join debate flow
   */
  nextStep: function(e) {
    if(e) e.preventDefault();
  	this.gotoStep(this.currentStep + 1);
  },
  
  /**
   * Go to the previous step in the join debate flow
   */
  prevStep: function(e) {
    if(e) e.preventDefault();
  	this.gotoStep(this.currentStep - 1);
  },
  
  /**
   * Go to the specified step in the join debate flow
   */
  gotoStep: function(step) {
  	if(this.currentStep == step) return;
  	this.$('div.step-' + this.currentStep).hide();
  	this.currentStep = step;
  	this.$('div.step-' + this.currentStep).css({'display':'block'});
  }
  
});

/**
 * ReplyPopupView
 */
window.ReplyPopupView = Backbone.View.extend({
  tagName: 'div',
  className: 'popup reply-popup',
  template: _.template($('#reply-popup-template').html()),
  
  events: {
    'submit form': 'onSubmit'
  },
  
  initialize: function() {
    this.currentStep = 0
  },
  
  render: function() {
    var data = {}
    data.qid = models.currentQuestion.id;
    data.did = models.currentDebate.id;
    $(this.el).html(this.template(data));
    return this;
  },
  
  /**
   * Post the reply using AJAX so the user does not have to
   * refresh the page.
   */
  onSubmit: function(e) {
    e.preventDefault();
    var $form = this.$('form');
    var $textarea = this.$('textarea');
    $.ajax({
      url: $form.attr('action'), type: $form.attr('method'),
      data: $form.serialize(),
      dataType: 'json',
      complete: $.proxy(function(data) {
        
      }, this),
      error: $.proxy(function(e, xhr) {
        var d = $.parseJSON(e.responseText);
        $textarea.val('');
        window.alert(d.error);
      }, this),
      success: $.proxy(function(data) {
        window.PopupHolder.closePopup();
        models.currentPosts.add(data);
        models.currentDebate.get('posts').push(data);
        models.currentDebate.change();
      }, this),
    });
  }
})

/**
 * ResponseItemView
 */
window.ResponseItemView = Backbone.View.extend({
  tagName: 'div',
  className: 'response-item',
  template: _.template($('#responses-item-template').html()),
  
  events: {
    'click a.reply-btn': 'onReplyClick'
  },
  
  render: function() {
    $(this.el).html(this.template(this.model.toJSON()));
    return this;
  },
  
  /**
   * Handle the click of a reply button
   */
  onReplyClick: function(e) {
    e.preventDefault();
    window.PopupHolder.showPopup(new ReplyPopupView);
  }
});

/**
 * ResponsesView
 */
window.ResponsesView = Backbone.View.extend({
  tagName: 'div',
  className: 'responses',
  template: _.template($('#responses-template').html()),
  
  initialize: function() {
    this.model.bind('add', $.proxy(this.onAdd, this));
  },
  
  render: function() {
    var data = this.model.toJSON();
    data.qid = models.currentQuestion.id;
    data.did = models.currentDebate.id;
    $(this.el).html(this.template(data));
    this.addAll();
    return this;
  },
  
  onAdd: function(post) {
    this.addOne(post);
  },
  
  /**
   * Add all responses
   */
  addAll: function() {
    this.model.each(this.addOne, this);
  },
  
  /**
   * Add a responses
   */
  addOne: function(item, index, append) {
    var view = new ResponseItemView({model:item}); // Create view
    this.$('ul')[(append)?'append':'prepend'](view.render().el); // Add to DOM
  },
  
  onResize: function(e) {
    var hW = $(window).width() / 2; // Half window
    var dLeft = Math.round(hW - $('div.responses').width() / 2);
    $('div.responses').css({ left:dLeft }); // Move the overlay
  }
  
});

/**
 * DebateDetailView
 */
window.DebateDetailView = Backbone.View.extend({
  tagName: 'div',
  className: 'detail-inner',
  template: _.template($('#debate-detail-template').html()),
  
  events: {
  	'click a.join-debate-btn': 'onJoinClick',
  	'click a.join-prevent': 'showLogin',
  },
  
  initialize: function() {
    models.currentDebate.bind('change', $.proxy(this.onAddResponse, this));
  },
  
  render: function() {
    var data = this.model.toJSON();
    //data.firstPost = data.posts[0];
    data.question = models.currentQuestion.attributes;
    data.raggedText = this.ragText(data.firstPost.text);
    data.yesNoClass = (data.firstPost.yesNo) ? 'yes' : 'no'; 
    $(this.el).html(this.template(data));
    this.onAddResponse();
    return this;
  },
  
  /**
   * Show the login popup if someone tries to join the debate and they
   * are not logged in.
   */
  showLogin: function(e) {
    e.preventDefault();
    tools.openLoginPopup('Before you can start a debate, you need to log in or sign up first.');
  },
  
  /**
   * Show the join debate view
   */
  onJoinClick: function(e) {
  	e.preventDefault();
  	window.JoinDebate = new JoinDebateView({ model: models.currentDebate }) 
  	$('div.join-outer').append($(JoinDebate.render().el).show());
  },
  
  /**
   * Generates HTML for the nice ragged text treatment.
   */
  ragText: function(text) {
    var formattedText = ''
    var first = true;
    while(text.length > 0) {
      var q1 = (first) ? '“' : '';
      lineBreak = this.getNextLine(text);
      formattedText += '<span>' + q1 + $.trim(text.substr(0, lineBreak));
      text = text.substring(lineBreak, text.length);
      var q2 = (text.length == 0) ? '”' : '';
      formattedText += q2 + "</span>";
      first = false;
    }
    return formattedText;
  },
  
  /**
   * Get's the next line in the ragged text treatment. Set the
   * maxChars variable to an appropriate amount if the width,
   * padding, or margins of the panel change at all.
   */
  getNextLine: function(text) {
    var maxChars = 50;
    if(text.length <= maxChars) {
      return (text == " ") ? 0 : text.length;
    }
    var spaceLeft = maxChars;
    for(var i = maxChars; i > 0; i--) {
      if(text.charAt(i) == " ") {
        spaceLeft = maxChars - i;
        break;
      }
    }
    return maxChars - spaceLeft;
  },
  
  /**
   * Bump up the response amount if a user posts a reply
   */
  onAddResponse: function(post) {
    var excerpt = _.last(this.model.get('posts')).text.substr(0, 25);
    var count = this.model.get('posts').length - 1;
    this.$('span.response-amt').text('"' + excerpt + '..." +' + count);
  }
  
});

/**
 * GalleryItemView
 */
window.GalleryItemView = Backbone.View.extend({
  tagName: 'li',
  className: 'unselected',
  template: _.template($('#gallery-item-template').html()),
  
  render: function() {
    var data = this.model.toJSON();
    data.qid = models.currentQuestion.id;
    $(this.el).html(this.template(data));
    return this;
  },
  
});

/**
 * GalleryView
 */
window.GalleryView = Backbone.View.extend({
  
  el: $('div.debates-gallery'),
  
  initialize: function() {
    this.model.bind('reset', this.addAll, this); // Bind to model event
    this.$overlay = this.$('.overlay-container'); // Question and filter overlay
    this.$container = this.$('div.gallery-container'); // Gallery container
    this.$detail = this.$('div.detail');
    this.$ul = this.$('ul'); // Gallery <ul> element
    this.render();
  },
  
  render: function() {
    this.$('span.question-text').text(models.currentQuestion.get('text'));
    return this;
  },
  
  addAll: function() {
    this.selectedIndex = -1;
    this.gWidth = 0;
    this.items = [];
    this.model.each(this.addOne, this);
  },
  
  /**
   * Add a gallery item
   */
  addOne: function(item, index) {
    var view = new GalleryItemView({model:item}); // Create view
    //var c = "#" + Math.floor(Math.random()*16777215).toString(16); // Random color
    $(view.el).css({ left:this.gWidth }); // Set left position
    this.$ul.append(view.render().el); // Add to DOM
    this.gWidth += $(view.el).width(); // Update total width
    this.$ul.width(this.gWidth); // Set <ul> width
    this.gWidth += 10;
    this.items.push(view);
  },
  
  /**
   * Set the current selection of the debate gallery
   */
  setSelection: function(id, animate) {
    // Remove stuff that might be there
    try { window.Responses.remove() } catch(e) { }
    
    // Get the item and index
    var item = this.model.getById(id);
    var index = this.model.indexOf(item);
    if(index == this.selectedIndex) return;
    
    try { this.detailView.remove() } catch(e) { }
    this.$overlay.show();
    // Set current selection
    this.selectedIndex = index;
    this.$selectedItem = $(this.$ul.children()[index]);
    
    // Show stuff that should be shown
    this.dLeft = -parseInt(this.$selectedItem.css('left'));
    this.detailView = new DebateDetailView( { model: models.currentDebate });
    this.detailView.render();
    
    if(animate) {
      this.$ul.stop().animate({'left': this.dLeft}, {
        complete: $.proxy(function(e) { 
          this.$detail.append($(this.detailView.el).show());
        }, this)
      });
    } else {
      this.$ul.css({left: this.dLeft });
      this.$detail.append(this.detailView.render().el);
    }
    this.onResize(); // Manual resize on init
  },
  
  onResize: function(e, pos) {
    var hW = $(window).width() / 2;
    var hI = (this.$selectedItem) ? this.$selectedItem.width() / 2 : 250;
    this.$container.css({ left:Math.round(hW - hI) });
    this.$overlay.css({ left: Math.round(hW - this.$overlay.width() / 2) });
    
    pos = (pos == undefined) ? this.el.css('position') : pos;
    this.el.css({"position":pos})
    
    var h = ($('div.responses').height() < 650) ? 650 : $('div.responses').height();
    $('div.content-inner').height(h);
  }
  
});

/**
 * HomeView
 */
window.HomeView = Backbone.View.extend({
  el: $('body.home-index'),
  
  initialize: function() {
    this.model.bind('change', this.render, this);
  },
});


/**
 * Question model
 */ 
window.Question = Backbone.Model.extend({
  urlRoot: '/api/questions',
});

/**
 * Debate model
 */ 
window.Debate = Backbone.Model.extend({
  urlRoot: '/api/threads',
});

/**
 * Post model
 */ 
window.Post = Backbone.Model.extend({
  urlRoot: '/api/posts'
})

/**
 * DebateList model
 */
window.DebateList = Backbone.Collection.extend({
  model: Debate,
  getById: function(id) {
    for(var i = 0; i < this.length; i++) {
      var item = this.at(i);
      if(item.get('id') == id) return item 
    }
    return null;
  }
});

/**
 * PostList model
 */
window.PostList = Backbone.Collection.extend({
  model: Post
});

/**
 * GalleryItem model
 */
window.GalleryItem = Backbone.Model.extend({
  
});

/**
 * GalleryItemList model
 */
window.GalleryItemList = Backbone.Collection.extend({
  model: GalleryItem
});


// Creating a namespace for the models
window.models = {}
models.currentQuestion = new Question
models.currentDebates = new DebateList
models.currentDebate = new Debate
models.currentPosts = new PostList


/**
 * WorkspaceRouter
 */
var WorkspaceRouter = Backbone.Router.extend({
  
  routes: {
    '':                                     'home',
    '/questions/:qid':                      'questions',
    '/questions/:qid/debates/':             'questions',
    '/questions/:qid/debates/:did':         'debates',
    '/questions/:qid/debates/:did/posts':   'posts',
  },
  
  home: function() {
    window.Home = new HomeView({ 
      model: models.currentQuestion 
    });
    this.questions("current");
  },
  
  questions: function(qid, did, animate, showposts) {
    models.currentQuestion.id = qid;
    models.currentQuestion.fetch({
      success: function(data) {
        models.currentQuestion.id = data.id;
        models.currentDebates = new DebateList;
        models.currentDebates.url = '/api/questions/' + data.id + '/threads';
        
        window.Gallery = new GalleryView({ model:models.currentDebates }); // Create gallery view
        window.resizeable.push(Gallery); // It's resizeable
        
        models.currentDebates.fetch({
          success: function(data) {
            var debateId = (did == null) ? models.currentDebates.at(0).get('id') : did;
            window.router.debates(models.currentQuestion.id, debateId, animate, showposts);
          }
        });
      }
    });
  },
  
  debates: function(qid, did, animate, showposts) {
    if(models.currentQuestion.id != qid) {
      window.router.questions(qid, did, false, showposts);
    } else {
      function showDebate(did, animate, showposts) {
        Gallery.setSelection(did, (animate == null) ? true : animate);
        if(showposts) window.router.posts(qid, did);
      }
      
      if(did != models.currentDebate.id) {
        models.currentDebate.id = did;
        models.currentDebate.fetch({
          success: function(data) {
            showDebate(did, animate, showposts);
          }
        })
      } else {
        showDebate(did, animate, showposts);
      }
      Gallery.onResize(null, 'relative');
    }
  },
  
  posts: function(qid, did) {
    if(models.currentQuestion.id != qid) {
      window.router.debates(qid, did, false, true);
    } else {
      models.currentPosts = new PostList(models.currentDebate.get('posts').reverse());
      window.Responses = new ResponsesView({ model: models.currentPosts });
      $('div.responses-outer').append($(Responses.render().el).show());
      $('#content').height($('div.responses').height());
      window.resizeable.push(Responses);
      Gallery.onResize(null, 'fixed');
      Responses.onResize();
    }
  },
  
});

$(function(){
  window.router = new WorkspaceRouter();
  Backbone.history.start();
});