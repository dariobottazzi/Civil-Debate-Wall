if(window.models === undefined) {
  window.models = {}
}
/*
models.MostDebatedList = Backbone.Collection.extend({
  
})
*/
window.StatsScreenView = Backbone.View.extend({
  tagName: 'div',
  className: 'stats-view',
  template: _.template($('#stats-screen-template').html()),
  
  events: {
    'click a.close-btn': 'onCloseClick',
    'change select.navigator': 'onNav',
  },
  
  initialize: function() {
    $('div.stats-outer').append($(this.render().el));
    
    
    var data = this.model.toJSON();
    
    window.StatsMostDebated = 
      new StatsMostDebatedView({
        el: $('div.most-debated'), 
        model: new Backbone.Collection(data.mostDebatedOpinions) 
      });
      
    window.StatsFrequentWords = 
      new StatsFrequentWordsView({
        el: $('div.frequent-words'),
        model: new Backbone.Collection(data.frequentWords)
      });
    
    this.$('div.screen').hide();
    this.gotoScreen('screen-1');
  },
  
  render: function() {
    var data = this.model.toJSON();
    $(this.el).html(this.template(data));
    
    var totalAnswers = data.debateTotals.yes + data.debateTotals.no;
    var yesWidth = Math.floor(100 * (data.debateTotals.yes / totalAnswers));
    var noWidth = 100 - yesWidth;
    
    this.$('div.opinions-bar .yes-bar').css({width: yesWidth + '%'});
    this.$('div.opinions-bar .no-bar').css({ width: noWidth + '%' });
    
    if(yesWidth <= noWidth) {
      this.$('div.yes-bar img').hide();
    }
    if(noWidth <= yesWidth) {
      this.$('div.no-bar img').hide();
    }
      
    return this
  },
  
  onNav: function(e) {
    this.gotoScreen($(e.currentTarget).val());
  },
  
  onCloseClick: function(e) {
    e.preventDefault();
    this.remove();
  },
  
  gotoScreen: function(screen) {
    console.log(screen);
    if(this.$currentScreen) this.$currentScreen.hide();
    this.$currentScreen = this.$('div.' + screen);
    this.$currentScreen.show();
  },
  
})

window.StatsMostDebatedDetailView = Backbone.View.extend({
  tagName: 'li',
  template: _.template($('#stats-most-debated-detail-template').html()),
  
  render: function() {
    var data = this.model.toJSON();
    data.qid = models.currentQuestion.id;
    data.raggedText = tools.ragText(data.firstPost.text, 40);
    $(this.el).html(this.template(data));
    $(this.el).addClass('item-' + this.model.get('rank'));
    var yesNo = (data.firstPost.yesNo == 0) ? 'no' : 'yes'
    $(this.el).addClass(yesNo);
    return this;
  }
});

window.StatsMostDebatedMenuView = Backbone.View.extend({
  tagName: 'li',
  template: _.template($('#stats-most-debated-menu-template').html()),
  
  render: function() {
    var data = this.model.toJSON();
    var selector = 'item-' + this.model.get('rank');
    $(this.el).html(this.template(data));
    $(this.el).addClass(selector);
    $(this.el).data('selector', selector);
    return this;
  }
});

window.StatsMostDebatedView = Backbone.View.extend({
  
  initialize: function() {
    this.addAll();
    this.$('div.detail-view li').hide();
    this.$('div.menu-view li').click($.proxy(function(e) {
      this.setSelection($(e.currentTarget).data('selector'));
    }, this));
    this.setSelection('item-1');
  },
  
  addAll: function() {
    this.model.each(this.addOne, this);
  },
  
  addOne: function(item, index) {
    item.set({rank:index + 1});
    
    var view = new StatsMostDebatedDetailView({model:item});
    this.$('div.detail-view ul').append(view.render().el);
    
    view = new StatsMostDebatedMenuView({model:item});
    this.$('div.menu-view ul').append(view.render().el);
  },
  
  setSelection: function(itemSelector) {
    if(this.currentSelector == itemSelector) return;
    
    if(this.$currentSelection) {
      var item = this.model.at(this.currentIndex)
      var yesNo = (item.get('firstPost').yesNo == 0) ? 'no' : 'yes';
      this.$currentSelection.removeClass('selected-' + yesNo)
      this.$('div.detail-view li.' + this.currentSelector).hide();
    }
    
    var index = itemSelector.charAt(itemSelector.length - 1)
    this.currentSelector = itemSelector;
    this.currentIndex = index - 1;
    
    var item = this.model.at(this.currentIndex);
    var yesNo = (item.get('firstPost').yesNo == 0) ? 'no' : 'yes';
    this.$currentSelection = this.$('div.menu-view li.' + this.currentSelector);
    this.$currentSelection.addClass('selected-' + yesNo)
    this.$('div.detail-view li.' + this.currentSelector).show();
  },
  
});

window.StatsFrequentWordsView = Backbone.View.extend({
  
  events: {
    'click a.back-btn': 'showWordMenu',
  },
  
  initialize: function() {
    this.detailPosts = [];
    this.render();  
  },
  
  render: function() {
    this.dRow = 0;
    this.allButtons = [];
    this.model.each(this.addWordBtn, this);
    
    $.each($('div.word-row'), function(index, item){
      // Adjust the top position of each row
      var $item = $(item);
      $item.css('top', index * 66);
      
      // Adjust the width of each row to be that of its buttons
      var width = 0;
      $.each($('button', item), function(i, btn) {
        width += $(btn).outerWidth();
      });
      $item.width(width+60);
      
    });
    
    this.$('button')
      .click($.proxy(function(e) {
        e.preventDefault();
        this.showWordDetail($(e.currentTarget).data('index'));
      }, this))
      .mouseover($.proxy(function(e) {
        e.preventDefault();
        var index = $(e.currentTarget).data('index');
        for(var i=0; i < this.allButtons.length; i++) {
          if(index != i) {
            this.allButtons[i].css('opacity', 0.5);
          }
        }
      }, this))
      .mouseout($.proxy(function(e) {
        e.preventDefault();
        for(var i=0; i < this.allButtons.length; i++) {
          this.allButtons[i].css('opacity', 1);
        }
      }, this));
      
    this.$('div.word-detail').hide();      
    
    return this;
  },
  
  addWordBtn: function(item, index) {
    // Get a color based on the ratio
    var colors = ['#68b7fd', '#5191d5', '#457ec1', '#3767a9', '#3a546c',
                  '#3f3c4d', '#6c4434', '#8a4d29', '#c8611d', '#e0681c']
    var cIndex = 9 - Math.round(item.get('ratio') * 9);
    
    // Create button
    var $btn = $('<button class="word-btn">' + item.get('word') + '</button>');
    $btn.css('background-color', colors[cIndex]);
    $btn.data('index', index);
    
    // Add it to the appropriate row
    var $row = $(this.$('div.word-row')[this.dRow]);
    $row.append($btn);
    
    // Increment the next row
    this.dRow = (this.dRow == 3) ? 0 : this.dRow + 1;
    
    this.allButtons.push($btn);
  },
  
  showWordMenu: function(e) {
    e.preventDefault();
    
    _.each(this.detailPosts, function(item) {item.remove() })
    this.detailPosts = [];
    
    this.$('div.word-detail').hide();
    this.$('div.word-menu').show();
  },
  
  showWordDetail: function(index) {
    
    this.$('div.word-menu').hide();
    this.$('div.word-detail').show();
    
    var model = this.model.at(index);
    var posts = model.get('posts');
    
    for(var i=0; i < posts.length; i++) {
      var view = new ResponseItemView({ model:new Backbone.Model(posts[i]) });
      this.detailPosts.push(view);
      this.$('div.responses-list').append(view.render().el);
    }
    
    $(this.el).height(Math.max(354, $('div.responses-list').height()));
    
  },
  
});