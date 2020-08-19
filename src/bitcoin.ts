import * as esplora from "@interlay/esplora-btc-api";

export type UTXO = {
  txid: string;
  value: number;
  vout: number;
};

export class BitcoinApi {
  txApi: esplora.TxApi;
  addrApi: esplora.AddressApi;
  blockApi: esplora.BlockApi;

  constructor() {
    const basePath = "https://blockstream.info/testnet/api";
    this.txApi = new esplora.TxApi({ basePath: basePath });
    this.addrApi = new esplora.AddressApi({ basePath: basePath });
    this.blockApi = new esplora.BlockApi({ basePath: basePath });
  }

  async getHexTransaction(txid: string): Promise<string> {
    return (await this.txApi.getTxHex(txid)).data;
  }

  async getAccountValue(addr: string): Promise<number> {
    const info = (await this.addrApi.getAddress(addr)).data;
    return info.chain_stats.funded_txo_sum || 0;
  }

  async getAccountUtxos(addr: string): Promise<Array<UTXO>> {
    const info = (await this.addrApi.getAddressUtxo(addr)).data;
    return info.map((utxo) => {
      return {
        txid: utxo.txid,
        value: utxo.value,
        vout: utxo.vout,
      };
    });
  }
}

export function satToBtc(sat: number) {
  return sat / Math.pow(10, 8);
}
