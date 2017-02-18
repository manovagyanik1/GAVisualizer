import { CLIENT_ID } from './constants.js';

class Gen {
	static authorizeUser() {
		gapi.analytics.auth.authorize({
			container: 'auth-button',
			clientid: CLIENT_ID,
		});
	}

	static getViewSelector(viewSelector) {
		return new gapi.analytics.ViewSelector({
			container: viewSelector
		});
	}

	static getTimeLine({dimensions, metrics, startDate, endDate, type, container}) {
		return new gapi.analytics.googleCharts.DataChart({
			reportType: 'ga',
			query: {
				'dimensions': dimensions,
				'metrics': metrics,
				'start-date': startDate,
				'end-date': endDate,
			},
			chart: {
				type: type,
				container: container
			}
		});
	}

	static initAuth({viewSelectors, timelines}) {

		// Hook up the components to work together.
		gapi.analytics.auth.on('success', (response) => {
			viewSelectors.map((v) => v.execute());
			Gen.getProfiles((profiles) => {
				window.profiles = profiles;
			});
		});
		gapi.analytics.auth.on('error', function (response) {
			console.log(response);
		});
	}

	static onViewSelectorChange(viewSelector){
		 viewSelector.on('change', function(data) {

			// Render all the of charts for this view.
			Gen.renderWeekOverWeekChart(data);
			Gen.renderYearOverYearChart(data);
			Gen.renderTopBrowsersChart(data);
			Gen.renderTopCountriesChart(data);
		 });
	}

	static generalExecuteTimeLine({viewSelector, timeline}) {

		viewSelector.on('change', function (ids) {
			var newIds = {
				query: {
					ids: ids
				}
			}
			timeline.set(newIds).execute();
		});
	}

	static getProfiles(cb) {
		//do we have a cached version?
		if (sessionStorage["gaProfiles"]) {
			console.log("profiles fetched from cache");
			cb(JSON.parse(sessionStorage["gaProfiles"]));
			return;
		}

		gapi.client.analytics.management.accounts.list().then(function (res) {
			var accountId = res.result.items[0].id;
			var profiles = [];
			gapi.client.analytics.management.webproperties.list({ 'accountId': accountId }).then(function (res) {

				res.result.items.forEach(function (item) {
					if (item.defaultProfileId) profiles.push({ id: "ga:" + item.defaultProfileId, name: item.name });
				});
				sessionStorage["gaProfiles"] = JSON.stringify(profiles);
				cb(profiles);
			});
		});
	}

	/**
	   * Draw the a chart.js line chart with data from the specified view that
	   * overlays session data for the current week over session data for the
	   * previous week.
	   */
	static renderWeekOverWeekChart(ids) {

		// Adjust `now` to experiment with different days, for testing only...
		var now = moment(); // .subtract(3, 'day');

		var thisWeek = Gen.query({
			'ids': ids,
			'dimensions': 'ga:date,ga:nthDay',
			'metrics': 'ga:sessions',
			'start-date': moment(now).subtract(1, 'day').day(0).format('YYYY-MM-DD'),
			'end-date': moment(now).format('YYYY-MM-DD')
		});

		var lastWeek = Gen.query({
			'ids': ids,
			'dimensions': 'ga:date,ga:nthDay',
			'metrics': 'ga:sessions',
			'start-date': moment(now).subtract(1, 'day').day(0).subtract(1, 'week')
				.format('YYYY-MM-DD'),
			'end-date': moment(now).subtract(1, 'day').day(6).subtract(1, 'week')
				.format('YYYY-MM-DD')
		});

		Promise.all([thisWeek, lastWeek]).then(function (results) {

			var data1 = results[0].rows.map(function (row) { return +row[2]; });
			var data2 = results[1].rows.map(function (row) { return +row[2]; });
			var labels = results[1].rows.map(function (row) { return +row[0]; });

			labels = labels.map(function (label) {
				return moment(label, 'YYYYMMDD').format('ddd');
			});

			var data = {
				labels: labels,
				datasets: [
					{
						label: 'Last Week',
						fillColor: 'rgba(220,220,220,0.5)',
						strokeColor: 'rgba(220,220,220,1)',
						pointColor: 'rgba(220,220,220,1)',
						pointStrokeColor: '#fff',
						data: data2
					},
					{
						label: 'This Week',
						fillColor: 'rgba(151,187,205,0.5)',
						strokeColor: 'rgba(151,187,205,1)',
						pointColor: 'rgba(151,187,205,1)',
						pointStrokeColor: '#fff',
						data: data1
					}
				]
			};

			new Chart(Gen.makeCanvas('chart-1-container')).Line(data);
			Gen.generateLegend('legend-1-container', data.datasets);
		});
	}

	/**
 * Draw the a chart.js bar chart with data from the specified view that
 * overlays session data for the current year over session data for the
 * previous year, grouped by month.
 */
	static renderYearOverYearChart(ids) {

		// Adjust `now` to experiment with different days, for testing only...
		var now = moment(); // .subtract(3, 'day');

		var thisYear = Gen.query({
			'ids': ids,
			'dimensions': 'ga:month,ga:nthMonth',
			'metrics': 'ga:users',
			'start-date': moment(now).date(1).month(0).format('YYYY-MM-DD'),
			'end-date': moment(now).format('YYYY-MM-DD')
		});

		var lastYear = Gen.query({
			'ids': ids,
			'dimensions': 'ga:month,ga:nthMonth',
			'metrics': 'ga:users',
			'start-date': moment(now).subtract(1, 'year').date(1).month(0)
				.format('YYYY-MM-DD'),
			'end-date': moment(now).date(1).month(0).subtract(1, 'day')
				.format('YYYY-MM-DD')
		});

		Promise.all([thisYear, lastYear]).then(function (results) {
			var data1 = results[0].rows.map(function (row) { return +row[2]; });
			var data2 = results[1].rows.map(function (row) { return +row[2]; });
			var labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
				'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

			// Ensure the data arrays are at least as long as the labels array.
			// Chart.js bar charts don't (yet) accept sparse datasets.
			for (var i = 0, len = labels.length; i < len; i++) {
				if (data1[i] === undefined) data1[i] = null;
				if (data2[i] === undefined) data2[i] = null;
			}

			var data = {
				labels: labels,
				datasets: [
					{
						label: 'Last Year',
						fillColor: 'rgba(220,220,220,0.5)',
						strokeColor: 'rgba(220,220,220,1)',
						data: data2
					},
					{
						label: 'This Year',
						fillColor: 'rgba(151,187,205,0.5)',
						strokeColor: 'rgba(151,187,205,1)',
						data: data1
					}
				]
			};

			new Chart(Gen.makeCanvas('chart-2-container')).Bar(data);
			Gen.generateLegend('legend-2-container', data.datasets);
		})
			.catch(function (err) {
				console.error(err.stack);
			});
	}


	/**
	 * Draw the a chart.js doughnut chart with data from the specified view that
	 * show the top 5 browsers over the past seven days.
	 */
	static renderTopBrowsersChart(ids) {

		Gen.query({
			'ids': ids,
			'dimensions': 'ga:browser',
			'metrics': 'ga:pageviews',
			'sort': '-ga:pageviews',
			'max-results': 5
		})
			.then(function (response) {

				var data = [];
				var colors = ['#4D5360', '#949FB1', '#D4CCC5', '#E2EAE9', '#F7464A'];

				if(response.rows) {
					response.rows.forEach(function (row, i) {
						data.push({ value: +row[1], color: colors[i], label: row[0] });
					});

					new Chart(Gen.makeCanvas('chart-3-container')).Doughnut(data);
					Gen.generateLegend('legend-3-container', data);

				}
			});
	}


	/**
	 * Draw the a chart.js doughnut chart with data from the specified view that
	 * compares sessions from mobile, desktop, and tablet over the past seven
	 * days.
	 */
	static renderTopCountriesChart(ids) {
		Gen.query({
			'ids': ids,
			'dimensions': 'ga:country',
			'metrics': 'ga:sessions',
			'sort': '-ga:sessions',
			'max-results': 5
		})
			.then(function (response) {

				var data = [];
				var colors = ['#4D5360', '#949FB1', '#D4CCC5', '#E2EAE9', '#F7464A'];

				if(response.rows){

					response.rows.forEach(function (row, i) {
						data.push({
							label: row[0],
							value: +row[1],
							color: colors[i]
						});
					});

					new Chart(Gen.makeCanvas('chart-4-container')).Doughnut(data);
					Gen.generateLegend('legend-4-container', data);
				}
			});
	}

	/**
	* Extend the Embed APIs `gapi.analytics.report.Data` component to
	* return a promise the is fulfilled with the value returned by the API.
	* @param {Object} params The request parameters.
	* @return {Promise} A promise.
	*/
	static query(params) {
		return new Promise(function (resolve, reject) {
			var data = new gapi.analytics.report.Data({ query: params });
			data.once('success', function (response) { resolve(response); })
				.once('error', function (response) { reject(response); })
				.execute();
		});
	}


	/**
	 * Create a new canvas inside the specified element. Set it to be the width
	 * and height of its container.
	 * @param {string} id The id attribute of the element to host the canvas.
	 * @return {RenderingContext} The 2D canvas context.
	 */
	static makeCanvas(id) {
		var container = document.getElementById(id);
		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');

		container.innerHTML = '';
		canvas.width = container.offsetWidth;
		canvas.height = container.offsetHeight;
		container.appendChild(canvas);

		return ctx;
	}


	/**
	 * Create a visual legend inside the specified element based off of a
	 * Chart.js dataset.
	 * @param {string} id The id attribute of the element to host the legend.
	 * @param {Array.<Object>} items A list of labels and colors for the legend.
	 */
	static generateLegend(id, items) {
		var legend = document.getElementById(id);
		legend.innerHTML = items.map(function (item) {
			var color = item.color || item.fillColor;
			var label = item.label;
			return '<li><i style="background:' + color + '"></i>' +
				Gen.escapeHtml(label) + '</li>';
		}).join('');
	}

	/**
	 * Escapes a potentially unsafe HTML string.
	 * @param {string} str An string that may contain HTML entities.
	 * @return {string} The HTML-escaped string.
	 */
	static escapeHtml(str) {
		var div = document.createElement('div');
		div.appendChild(document.createTextNode(str));
		return div.innerHTML;
	}

	static initChartDefaults() {
		// Set some global Chart.js defaults.
		Chart.defaults.global.animationSteps = 60;
		Chart.defaults.global.animationEasing = 'easeInOutQuart';
		Chart.defaults.global.responsive = true;
		Chart.defaults.global.maintainAspectRatio = false;
	}

}

export default Gen;
