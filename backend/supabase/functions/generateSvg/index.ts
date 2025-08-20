import { parseHTML } from "linkedom";
import * as d3 from "d3";

const { document } = parseHTML(`
    <!doctype html>
    <html lang="en">
      <body>
        <svg class="root"></svg>
      </body>
    </html>
  `);

// Global variables
const csvString = `Date,Subscribers,Uom,Type,SegmentId,Note
  Jan 2025,"34000","null",Stock,0,"null"
  Q1,"14000","null",Flow,1,"null"
  Q2,"12000","null",Flow,2,"null"
  Q3,"24000","null",Flow,3,"Price hike from 10 to 14 USD per user"
  Q4,"-12000","null",Flow,4,"Drop due to Netflix price hikes\, competitive pressure and negative macro environment"
  Dec 2025,"72000","null",Stock,0,"null"`;

const productLoop = "Built with chartt.co";

const margin = { top: 120, right: 30, bottom: 60, left: 30 };
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;
const padding = 0.4;

const neutralColour = "#6b7280" // Gray 500

function transformRow(row) {
  const rowValues = Object.values(row);
  return {
    index: rowValues[0],
    value: parseFloat(rowValues[1]),
    uom: (rowValues[2] === "null") ? null : rowValues[2],
    type: rowValues[3],
    segmentId: parseFloat(rowValues[4]),
    note: (rowValues[5] === "null") ? null : rowValues[5]
  };
}

function transformData(data) {

  let cumulative = 0;
  let transformedData = JSON.parse(JSON.stringify(data)); // Deep object cloning
  transformedData = transformedData.map((item) => {
    item.valueStart = 0;
    item.valueEnd = 0;

    if (item.type === "Stock") {
      item.valueEnd = item.value;
      cumulative += item.value;
    }
    else if (item.type === "Flow") {
      item.valueStart = cumulative;
      cumulative += item.value;
      item.valueEnd = cumulative;

    }
    delete item.value;
    return item;
  });
  return transformedData;
}

function renderGraph(data, chartConfig) {
  //const fillColours = ["#060200", "#051C2A", "#163E93", "#30A3DA", "#FFFFFF"]; // McKinsey palette
  //const borderColours = ["#060200", "#051C2A", "#163E93", "#30A3DA", "#060200"]; // Complementary McKinsey palette

  const title = chartConfig.title || "Netflix subscribers increased every quarter, except Q4 2025";
  const subTitle = chartConfig.subtitle || "Netflix subscribers increased every quarter, except Q4 2025";
  const source = chartConfig.source || "In thousands of subscribers";
  const fillColours = [chartConfig.colorId || "#060200"];
  const borderColours = [chartConfig.colorId || "#060200"];


  const root = d3.select(document.body).select(".root")
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);

  // Adding the chart title, sub-title and source
  root.append('text')
    .attr('x', margin.left)
    .attr('y', margin.top / 2)
    .text(title)
    .style('fill', "black")
    .style('font-weight', '600')
    .style('font-size', '20');

  root.append('text')
    .attr('x', margin.left)
    .attr('y', margin.top * 2 / 3)
    .text(subTitle)
    .style('fill', neutralColour)
    .style('font-weight', '400')
    .style('font-size', '15');

  root.append('text')
    .attr('x', margin.left)
    .attr('y', height + margin.top + margin.bottom * 2 / 3)
    .text(productLoop)
    .style('fill', neutralColour)
    .style('font-weight', '400')
    .style('font-size', '12');

  root.append('text')
    .attr('x', margin.left)
    .attr('y', height + margin.top + margin.bottom * 2.7 / 3)
    .text(source)
    .style('fill', neutralColour)
    .style('font-weight', '400')
    .style('font-size', '12');

  // Start building the chart itself
  const chart = root.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleBand()
    .rangeRound([0, width])
    .domain(data.map((d) => {
      return d.index;
    }))
    .padding(padding);

  const y = d3
    .scaleLinear()
    .domain([d3.min(data.map((d) => d.valueStart)), d3.max(data.map((d) => d.valueEnd))])
    .range([height, 0]);

  chart.append("g")
    .attr('class', 'x axis')
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSize(0).tickPadding(10));
  // Customizing the horizontal axis
  chart.select(".x.axis").select(".domain")
    .style('stroke', neutralColour);
  chart.select(".x.axis").selectAll("text")
    .style('fill', neutralColour)
    .style('font-size', '12')
    .style('font-weight', '400');

  const bars = chart.append("g").attr('class', 'bars').selectAll('rect')
    .data(data)
    .join('rect')
    .attr('class', 'x axis')
    .attr('width', x.bandwidth())
    .attr('height', (d) => { return Math.abs(y(d.valueEnd) - y(d.valueStart)); })
    .attr('transform', (d) => {
      return `translate(${x(d.index)},${y(Math.max(d.valueEnd, d.valueStart))})`;
    })
    .attr('rx', 3)
    .attr('class', 'bar')
    .style('fill', (d) => {
      return fillColours[d.segmentId % fillColours.length];
    })
    .style('stroke', (d) => {
      return borderColours[d.segmentId % borderColours.length];
    });

  // Add the value on each bar
  let gLabels = chart.append("g").attr('class', 'labels');
  bars.each((d) => {
    let yPosition = y(Math.max(d.valueEnd, d.valueStart));
    let textContent = (d.valueEnd - d.valueStart) >= 0 ? `+${(d.valueEnd - d.valueStart)}` : (d.valueEnd - d.valueStart);
    let colour = borderColours[d.segmentId % borderColours.length];

    // For Stock bars, the labels are at the middle of the bar
    if (d.type === "Stock") {
      yPosition = y((d.valueEnd + d.valueStart) / 2);
      textContent = (d.valueEnd - d.valueStart);
      colour = "white"
    }
    let gLabel = gLabels
      .append('text')
      .attr('x', x(d.index) + x.bandwidth() / 2)
      .attr('y', yPosition)
      .text(textContent)
      .style('fill', colour)
      .style('text-anchor', 'middle')
      .style('font-weight', '600');

    if (d.type === "Flow") {
      gLabel = gLabel.attr('dy', '-.5em')
    }
    return gLabel;
  });

  // Add the connecting lines
  let gConnectors = chart.append("g").attr('class', 'connectors');
  bars.each((d, i) => {
    if (i < (data.length - 1)) { // We don't add a connector for the last bar
      let gConnector = gConnectors.append('line')
        .attr('x1', x(d.index) + x.bandwidth() + 5)
        .attr('y1', y(d.valueEnd))
        .attr('x2', x(d.index) + x.step() - 5)
        .attr('y2', y(d.valueEnd))
        .style('stroke', neutralColour)
        .style('stroke-dasharray', 3);
      return gConnector;
    }
  })

  // Add the annotations (if any)
  const gAnnotation = chart
    .append("g")
    .attr("class", "annotation-group");

  data.forEach((item) => {
    if (item.note !== null) {
      gAnnotation.append('line')
        .attr('x1', x(item.index) + x.bandwidth() / 2)
        .attr('y1', (y(item.valueStart) + y(item.valueEnd)) / 2)
        .attr('x2', x(item.index) + x.bandwidth() / 2) // Same as x1
        .attr('y2', ((y(item.valueStart) + y(item.valueEnd)) / 2) + Math.abs(y(item.valueStart) - y(item.valueEnd))) // y2 = y1 + bar height
        .style('stroke', neutralColour)
        .style('stroke-dasharray', 3)

      gAnnotation.append('text')
        .attr('x', x(item.index) + x.bandwidth() / 2)
        .attr('y', ((y(item.valueStart) + y(item.valueEnd)) / 2) + Math.abs(y(item.valueStart) - y(item.valueEnd)))
        .text(item.note)
        .style('fill', neutralColour)
        .style('font-weight', '400')
        .style('font-size', '12');
    }
  });

  return document.querySelector('.root')
}

Deno.serve(async (req) => {
  try {
    // Parse request body as JSON chart config
    const chartConfig = await req.json();
    // Parse CSV and transform data
    const data = d3.csvParse(csvString).map(transformRow);
    const transformedData = transformData(data);
    // Generate SVG, pass chartConfig as second parameter
    const svgContent = renderGraph(transformedData, chartConfig);
    // Return SVG response
    return new Response(svgContent, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    return new Response(`Error generating SVG: ${error.message}`, {
      status: 500
    });
  }
});
