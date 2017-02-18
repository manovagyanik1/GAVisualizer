import Gen from './gen.js';

(function(w,d,s,g,js,fjs){
	console.log('trying to load gapi');
  g=w.gapi||(w.gapi={});g.analytics={q:[],ready:function(cb){this.q.push(cb)}};
  js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
  js.src='https://apis.google.com/js/platform.js';
  fjs.parentNode.insertBefore(js,fjs);js.onload=function(){g.load('analytics')};
}(window,document,'script'));

$(document).ready(function(){
  function showNext() {
     if(!$('.slider').hasClass('projection')){
      $('.slider').addClass('projection');
    }
    var l = $('.Chartjs').length;
    for (var i=0; i<l-1; i++) {
      var element = $($('.Chartjs')[i]);
      if(!element.hasClass('hide')){
        element.addClass('hide');
        break;
      }
      if(i === l-2){
        $('.Chartjs').removeClass('hide');
      }
    }
  }

  $('#btnProject').click(function(){
   //showNext();
   repeat();
  });

  function repeatNext() {
    showNext();
    repeat();
  }

  function repeat() {
    window.setInterval(() => {
      repeatNext();
    }, 5000);
  }

  // repeat();
});

gapi.analytics.ready(function() {

  console.log('gapi ready now');
  Gen.authorizeUser();
  var viewSelectors = [];
  var timelines = [];

  // Create the view selector.
  viewSelectors[0] = Gen.getViewSelector('view-selector1');

  // Create the timeline chart.
  timelines[0] = Gen.getTimeLine({
      dimensions: 'ga:date',
      metrics: 'ga:sessions',
      startDate: '30daysAgo',
      endDate: 'yesterday',
      type: 'LINE',
      container: 'timeline1'
  });

  Gen.initAuth({viewSelectors, timelines});
  Gen.initChartDefaults();

  viewSelectors.map((v, i) => {
    Gen.onViewSelectorChange(v);
    // Gen.generalExecuteTimeLine({viewSelector: v, timeline: timelines[i]});
  });
});
