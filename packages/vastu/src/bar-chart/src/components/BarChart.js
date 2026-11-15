import { LitElement, html, css } from 'lit';
import { select } from 'd3-selection';
import { scaleBand, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import 'd3-transition';

/**
 * Bar chart: <bar-chart></bar-chart>.
 *
 * Plots ordinal values on the x axis against numbers on the y axis, drawn with D3.
 * Set `data` to new values and the bars animate to them, so it can show real-time data.
 * In a container narrower than `width` it shrinks to fit, keeping its proportions.
 *
 * @property data {Array} - [{ group: String, value: Number }], default [].
 * @property width {Number} - Width in pixels, default 460. The chart shrinks to fit a narrower container.
 * @property height {Number} - Height in pixels at full width, default 400.
 * @property min {Number} - Lowest value on the y axis, default 0.
 * @property max {Number} - Highest value on the y axis, default: the largest value in `data`.
 * @property transitionDuration {Number} - Milliseconds the bars take to animate, default 1000. Attribute: transitionduration.
 * @property dataAPI {String} - URL to load { data, min?, max? } from. Attribute: dataapi.
 * @property autoUpdate {Boolean} - Reload from dataAPI every updateFrequency seconds, default false. Attribute: autoupdate.
 * @property updateFrequency {Number} - Seconds between reloads when autoUpdate is on, default 60. Attribute: updatefrequency.
 * @property label {String} - Accessible name of the chart, default "Bar chart".
 *
 * @fires updated - After new data has been loaded from dataAPI. event.detail is the API response.
 *
 * @cssproperty --bar-chart-background-color - Background of the chart, default transparent.
 * @cssproperty --bar-chart-bar-color - Colour of the bars, default #69B3A2.
 * @cssproperty --bar-chart-axis-color - Colour of the axis lines, default currentColor.
 * @cssproperty --bar-chart-text-color - Colour of the axis labels, default currentColor.
 */
export default class BarChart extends LitElement {
  static styles = css`
    :host {
      display: block;
      max-width: 100%;
    }

    .chart {
      width: fit-content;
      max-width: 100%;
      background-color: var(--bar-chart-background-color, transparent);
    }

    svg {
      display: block;
    }

    rect {
      fill: var(--bar-chart-bar-color, #69b3a2);
    }

    .axis path,
    .axis line {
      stroke: var(--bar-chart-axis-color, currentColor);
    }

    .axis text {
      fill: var(--bar-chart-text-color, currentColor);
      font-size: 12px;
    }
  `;

  static properties = {
    width: { type: Number },
    height: { type: Number },
    data: { type: Array },
    min: { type: Number },
    max: { type: Number },
    transitionDuration: { type: Number },
    dataAPI: {},
    updateFrequency: { type: Number },
    autoUpdate: { type: Boolean },
    label: {},
    _fitWidth: { state: true },
  };

  constructor() {
    super();
    this.width = 460;
    this.height = 400;
    this.data = [];
    this.min = 0;
    this.max = undefined;
    this.transitionDuration = 1000;
    this.dataAPI = '';
    this.updateFrequency = 60;
    this.autoUpdate = false;
    this.label = 'Bar chart';
  }

  connectedCallback() {
    super.connectedCallback();
    // Redraw at the real available width instead of scaling the SVG, so labels stay readable.
    this._resizeObserver ??= new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      if (width && width !== this._fitWidth) this._fitWidth = width;
    });
    this._resizeObserver.observe(this);
    if (this.dataAPI) {
      this.fetchResults();
      if (this.autoUpdate) {
        this.setupUpdateTimer();
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    this.removeUpdateTimer();
  }

  setupUpdateTimer() {
    if (!this._timer) {
      this._timer = setInterval(() => this.fetchResults(), this.updateFrequency * 1000);
    }
  }

  removeUpdateTimer() {
    clearInterval(this._timer);
    this._timer = undefined;
  }

  async fetchResults() {
    try {
      const response = await fetch(this.dataAPI);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.updateView(await response.json());
    } catch (error) {
      console.warn('bar-chart: loading data failed', error);
    }
  }

  updateView(result) {
    if (result.min !== undefined) this.min = result.min;
    if (result.max !== undefined) this.max = result.max;
    this.data = result.data;
    this.dispatchEvent(new CustomEvent('updated', { detail: { ...result }, bubbles: true, composed: true }));
  }

  render() {
    return html`<div class="chart"></div>`;
  }

  firstUpdated() {
    this._svg = select(this.renderRoot.querySelector('.chart')).append('svg').attr('role', 'img');
    this._plot = this._svg.append('g');
    this._xAxis = this._plot.append('g').attr('class', 'axis x');
    this._yAxis = this._plot.append('g').attr('class', 'axis y');
    this._bars = this._plot.append('g').attr('class', 'bars');
  }

  updated() {
    // In a container narrower than `width`, shrink the chart and keep its proportions.
    const width = Math.min(this.width, this._fitWidth || this.width);
    const height = width < this.width ? Math.max(200, Math.round((this.height * width) / this.width)) : this.height;
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const data = Array.isArray(this.data) ? this.data : [];
    const max = this.max ?? Math.max(this.min + 1, ...data.map((d) => d.value));

    this._svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('aria-label', `${this.label}: ${data.map((d) => `${d.group} ${d.value}`).join(', ')}`);
    this._plot.attr('transform', `translate(${margin.left},${margin.top})`);

    const x = scaleBand().range([0, innerWidth]).domain(data.map((d) => d.group)).padding(0.2);
    const y = scaleLinear().domain([this.min, max]).range([innerHeight, 0]).clamp(true);

    this._xAxis.attr('transform', `translate(0,${innerHeight})`).call(axisBottom(x));
    this._yAxis.call(axisLeft(y));

    this._bars
      .selectAll('rect')
      .data(data, (d) => d.group)
      .join(
        (enter) => enter.append('rect').attr('x', (d) => x(d.group)).attr('y', y(this.min)).attr('height', 0),
        (update) => update,
        (exit) => exit.transition().duration(this.transitionDuration / 2).attr('y', y(this.min)).attr('height', 0).remove()
      )
      .transition()
      .duration(this.transitionDuration)
      .attr('x', (d) => x(d.group))
      .attr('width', x.bandwidth())
      .attr('y', (d) => y(d.value))
      .attr('height', (d) => innerHeight - y(d.value));
  }
}

if (!customElements.get('bar-chart')) {
  customElements.define('bar-chart', BarChart);
}
