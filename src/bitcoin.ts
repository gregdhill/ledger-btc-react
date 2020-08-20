import * as esplora from "@interlay/esplora-btc-api";
import * as bitcoin from "bitcoinjs-lib";

export interface UTXO {
  txid: string;
  value: number;
  vout: number;
  addr: string;

  key(): string;
}

export interface AccountInfo {
  checked: boolean;
  index: number;
  value: number;
}

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

  // accumulated account balance
  async getAccountValue(addr: string): Promise<number> {
    const info = (await this.addrApi.getAddress(addr)).data;
    return info.chain_stats.funded_txo_sum || 0;
  }

  // all unspent outputs for an account
  async getAccountUtxos(addr: string): Promise<Array<UTXO>> {
    const info = (await this.addrApi.getAddressUtxo(addr)).data;
    return info.map((utxo) => {
      return {
        txid: utxo.txid,
        value: utxo.value,
        vout: utxo.vout,
        addr: addr,

        key: () => {
          return `${utxo.txid}${utxo.vout}`;
        },
      };
    });
  }

  async broadcastTx(hex: string) {
    const result = await this.txApi.postTx(hex);
    return result.data;
  }
}

export function getTxLink(txId: string) {
  return `https://www.blockchain.com/btc-testnet/tx/${txId}`;
}

export function getTxId(hex: string) {
  const tx = bitcoin.Transaction.fromHex(hex);
  return tx.getId();
}

export function satToBtc(sat: number) {
  // TODO: use big int library
  return sat / Math.pow(10, 8);
}
