import React, { Component } from "react";
import { BitcoinApi, satToBtc, UTXO, AccountInfo } from "../bitcoin";
import { Table, Form, Jumbotron } from "react-bootstrap";
import { FaClipboard } from "react-icons/fa";
import CopyToClipboard from "react-copy-to-clipboard";

interface Props {
  apiBtc: BitcoinApi;
  accounts: Map<string, AccountInfo>;
  outputs: Map<string, UTXO>;
  addOutput(utxo: UTXO): void;
  removeOutput(utxo: UTXO): void;
}

interface State {
  outputs: Array<UTXO>;
  total: number;
}

// TODO: poll update utxos
export default class SelectOutputs extends Component<Props> {
  state: State = {
    outputs: [],
    total: 0,
  };

  async componentDidMount() {
    const { apiBtc, accounts } = this.props;
    // fetch all account utxos
    const utxos = await Promise.all(
      [...accounts]
        .filter(([, info]) => info.checked)
        .map(([addr]) => {
          return apiBtc.getAccountUtxos(addr);
        })
    );
    this.setState({
      outputs: utxos.flat(),
    });
  }

  onChange(utxo: UTXO, e: React.ChangeEvent<HTMLInputElement>) {
    // TODO: display active total
    let { total } = this.state;
    const { checked } = e.target;

    if (checked) {
      this.props.addOutput(utxo);
      total += utxo.value;
    } else {
      this.props.removeOutput(utxo);
      total -= utxo.value;
    }

    this.setState({ total: total });
  }

  render() {
    return (
      <div>
        <Jumbotron>
          <h1 className="header">Select Unspent Outputs</h1>
        </Jumbotron>

        <Form.Group>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th></th>
                <th></th>
                <th>TxID</th>
                <th>Index</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {this.state.outputs.map((utxo) => {
                return (
                  <tr key={utxo.txid}>
                    <td>
                      <input
                        type="checkbox"
                        value={utxo.txid + utxo.vout}
                        onChange={this.onChange.bind(this, utxo)}
                        checked={this.props.outputs.has(utxo.key())}
                      />
                    </td>
                    <td>
                      <CopyToClipboard text={utxo.txid}>
                        <FaClipboard style={{ cursor: "pointer" }} />
                      </CopyToClipboard>
                    </td>
                    <td>
                      {utxo.txid.substr(0, 10)}...
                      {utxo.txid.substr(utxo.txid.length - 10)}
                    </td>
                    <td>{utxo.vout}</td>
                    <td>{satToBtc(utxo.value).toString()} BTC</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Form.Group>
      </div>
    );
  }
}
