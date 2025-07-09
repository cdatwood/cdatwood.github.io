const dscc = require('@google/dscc');
const d3 = require('d3');

function drawViz(data, config) {
  const container = document.getElementById('viz');
  container.innerHTML = '';

  const width = container.offsetWidth;
  const height = container.offsetHeight;
  const margin = { top: 40, right: 60, bottom: 60, left: 60 };

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const rows = data.tables.DEFAULT;

  const processed = rows.map(row => ({
    dim1: row.dimensions[0],
    dim2: row.dimensions[1],
    m1: row.metrics[0],
    m2: row.metrics[1]
  }));

  processed.forEach(d => {
    d.xKey = `${d.dim1}:${d.dim2}`;
  });

  const xScale = d3.scaleBand()
    .domain(processed.map(d => d.xKey))
    .range([0, innerWidth])
    .padding(0.2);

  const yLeft = d3.scaleLinear()
    .domain([0, d3.max(processed, d => Math.max(d.m1, d.m2))])
    .range([innerHeight, 0]);

  const yRight = d3.scaleLinear()
    .domain([0, d3.max(processed, d => Math.max(d.m1, d.m2))])
    .range([innerHeight, 0]);

  chart.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(xScale).tickFormat(d => d.split(":")[1]));

  chart.append("g").call(d3.axisLeft(yLeft));
  chart.append("g")
    .attr("transform", `translate(${innerWidth},0)`)
    .call(d3.axisRight(yRight));

  // Configure series: choose type and axis
  const series = [
    { key: 'm1', type: 'bar', axis: 'left', color: 'steelblue' },
    { key: 'm2', type: 'line', axis: 'right', color: 'orange' }
  ];

  // Draw bars
  series.filter(s => s.type === 'bar').forEach(s => {
    const y = s.axis === 'left' ? yLeft : yRight;
    chart.selectAll(`.bar-${s.key}`)
      .data(processed)
      .enter()
      .append("rect")
      .attr("class", `bar-${s.key}`)
      .attr("x", d => xScale(d.xKey))
      .attr("y", d => y(d[s.key]))
      .attr("width", xScale.bandwidth() / series.length)
      .attr("height", d => innerHeight - y(d[s.key]))
      .attr("fill", s.color)
      .attr("transform", `translate(${series.indexOf(s) * (xScale.bandwidth() / series.length)}, 0)`);
  });

  // Draw lines with gradient fill
  series.filter(s => s.type === 'line').forEach(s => {
    const y = s.axis === 'left' ? yLeft : yRight;
    const gradientId = `gradient-${s.key}`;

    // Define gradient
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", gradientId)
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", s.color)
      .attr("stop-opacity", 0.4);

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", s.color)
      .attr("stop-opacity", 0);

    // Area under line
    const area = d3.area()
      .x(d => xScale(d.xKey) + xScale.bandwidth() / 2)
      .y0(innerHeight)
      .y1(d => y(d[s.key]));

    chart.append("path")
      .datum(processed)
      .attr("fill", `url(#${gradientId})`)
      .attr("d", area);

    // Line path
    const line = d3.line()
      .x(d => xScale(d.xKey) + xScale.bandwidth() / 2)
      .y(d => y(d[s.key]));

    chart.append("path")
      .datum(processed)
      .attr("fill", "none")
      .attr("stroke", s.color)
      .attr("stroke-width", 2)
      .attr("d", line);
  });
}

dscc.subscribeToData(drawViz, { transform: dscc.objectTransform });
