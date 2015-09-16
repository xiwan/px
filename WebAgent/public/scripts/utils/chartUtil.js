(function () {


    function load(script) {
        document.write('<' + 'script src="' + script + '" type="text/javascript"><' + '/script>');
    }

    load("/scripts/amcharts/amcharts.js");
    load("/scripts/amcharts/serial.js");
})();


//워터 마크 삭제 이벤트
$(document).on('click', 'g', deleteMark);
var chartColor = { 1: '#0d8ecf', 2: '#fcd202' };

function lineChart(chartData, title, color) {
    // SERIAL CHART
    chart = new AmCharts.AmSerialChart();
    chart.dataProvider = chartData;
    chart.categoryField = "category";
    chart.startDuration = 0;
    chart.balloon.color = "#000000";


    // AXES
    // category
    var categoryAxis = chart.categoryAxis;
    categoryAxis.fillAlpha = 1;
    categoryAxis.fillColor = "#FAFAFA";
    categoryAxis.gridAlpha = 0;
    categoryAxis.axisAlpha = 0;
    categoryAxis.gridPosition = "start";
    categoryAxis.position = "top";

    // value
    var valueAxis = new AmCharts.ValueAxis();
    valueAxis.title = title;
    valueAxis.dashLength = 5;
    valueAxis.axisAlpha = 0;
    valueAxis.minimum = 0;
    valueAxis.maximum = maxValue;
    valueAxis.integersOnly = true;
    valueAxis.gridCount = 10;
    valueAxis.reversed = false; // this line makes the value axis reversed
    chart.addValueAxis(valueAxis);


    Object.keys(chartData[0]).forEach(function (key, idx) {

        if (key !== 'category') {
            var graph = new AmCharts.AmGraph();
            graph.title = key;
            graph.valueField = key;
            graph.balloonText = key + "[[category]]: [[value]]";
            graph.bullet = "round";
            graph.lineAlpha = 1;
            if (color !== undefined) {
                graph.lineColor = color[idx-1];
            }
            chart.addGraph(graph);
        }

    });

    // CURSOR
    var chartCursor = new AmCharts.ChartCursor();
    chartCursor.cursorPosition = "mouse";
    chartCursor.zoomable = false;
    chartCursor.cursorAlpha = 0;
    chart.addChartCursor(chartCursor);

    // LEGEND
    var legend = new AmCharts.AmLegend();
    legend.useGraphSettings = true;
    chart.addLegend(legend);

    // WRITE
    chart.write("chartdiv");
    deleteMark();
};

function barChart(chartData, title) {
    // SERIAL CHART
    chart = new AmCharts.AmSerialChart();
    chart.dataProvider = chartData;
    chart.categoryField = "category";
    chart.color = "#7F7F7F";
    chart.fontSize = 14;
    chart.startDuration = 1;
    chart.plotAreaFillAlphas = 0.2;
    // the following two lines makes chart 3D
    chart.angle = 30;
    chart.depth3D = 30;

    // AXES
    // category
    var categoryAxis = chart.categoryAxis;
    categoryAxis.gridAlpha = 0.2;
    categoryAxis.gridPosition = "start";
    categoryAxis.gridColor = "#7F7F7F";
    categoryAxis.axisColor = "#7F7F7F";
    categoryAxis.axisAlpha = 0.5;
    categoryAxis.dashLength = 5;

    // value
    var valueAxis = new AmCharts.ValueAxis();
    valueAxis.stackType = "3d";
    valueAxis.gridAlpha = 0.5;
    valueAxis.gridColor = "#7F7F7F";
    valueAxis.axisColor = "#7F7F7F";
    valueAxis.axisAlpha = 0.5;
    valueAxis.dashLength = 5;
    valueAxis.title = title;
    valueAxis.titleColor = "#7F7F7F";
    chart.addValueAxis(valueAxis);

    Object.keys(chartData[0]).forEach(function (key, idx) {

        if (key !== 'category') {
            var graph = new AmCharts.AmGraph();
            graph.title = key;
            graph.valueField = key;
            graph.type = "column";
            graph.lineAlpha = 0;
            graph.lineColor = chartColor[idx];
            graph.fillAlphas = 1;
            graph.balloonText = key + " [[category]]: [[value]]";
            chart.addGraph(graph);
        }

    });

    chart.write("chartdiv");
    deleteMark();
}

function deleteMark() {
   $($('tspan')[Object.keys($('tspan')).length - 5]).css('display', 'none');
}
