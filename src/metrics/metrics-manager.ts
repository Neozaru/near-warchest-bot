import PrometheusExporter from "./prometheus-exporter";
import { fetchStakingData } from "../near-utils";
import { createLoggerWithLabel } from "../logger-factory";

export default class MetricsManager {

  private prometheusExporter;
  logger = createLoggerWithLabel('Metrics');

  // TODO: Metrics manager takes global config ?
  constructor(private near, private config) {
    this.prometheusExporter = new PrometheusExporter(config.metrics);
  }


  private async refreshMetrics(account) {
    const {near, config, logger} = this;
    const data = await fetchStakingData(near, account, config.poolAccountId, config.delegatorAccountId);
    logger.log('info', `Updating metrics`);
    this.prometheusExporter && this.prometheusExporter.feed({
      ...data,
      lowThresholdSeatPrice: data.nextSeatPrice.muln(config.rebalancing.levels.lowThreshold),
      highThresholdSeatPrice: data.nextSeatPrice.muln(config.rebalancing.levels.highThreshold),
    })
  }

  public async enable() {
    const {near, config, logger} = this;

    logger.log('info', `Enabling metrics...`);
    const account = await near.account(config.delegatorAccountId);
    this.prometheusExporter.serve();
    this.refreshMetrics(account);
    setInterval(() => this.refreshMetrics(account), this.config.metrics.interval * 1000);
  }

}