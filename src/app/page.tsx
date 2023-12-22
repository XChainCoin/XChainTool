"use client";

import {
  Button,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
} from "@mui/material";
import { useCallback, useState } from "react";
import {
  Chain,
  createWalletClient,
  Hex,
  http,
  isAddress,
  parseEther,
  SendTransactionErrorType,
  stringToHex,
  webSocket,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

import Log from "@/components/Log";
import { ChainKey, inscriptionChains } from "@/config/chains";
import useInterval from "@/hooks/useInterval";
import { handleAddress, handleLog } from "@/utils/helper";

const example =
  'Data:,{"p":"asc-20","op":"mint","tick":"aval","amt":"100000000"}';

type RadioType = "meToMe" | "manyToOne";

type GasRadio = "all" | "tip";


export default function Home() {
  const [chain, setChain] = useState<Chain>(mainnet);
  const [privateKeys, setPrivateKeys] = useState<Hex[]>([]);
  const [radio, setRadio] = useState<RadioType>("meToMe");
  const [toAddress, setToAddress] = useState<Hex>();
  const [rpc, setRpc] = useState<string>();
  const [inscription, setInscription] = useState<string>("");
  const [gas, setGas] = useState<number>(0);
  const [running, setRunning] = useState<boolean>(false);
  const [delay, setDelay] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState<number>(0);
  const [gasRadio, setGasRadio] = useState<GasRadio>("tip");

  const pushLog = useCallback((log: string, state?: string) => {
    setLogs((logs) => [handleLog(log, state), ...logs]);
  }, []);

  const client = createWalletClient({
    chain,
    transport: rpc && rpc.startsWith("wss") ? webSocket(rpc) : http(rpc),
  });
  const accounts = privateKeys.map((key) => privateKeyToAccount(key));

  useInterval(
    async () => {
      const results = await Promise.allSettled(
        accounts.map((account) => {
          return client.sendTransaction({
            account,
            to: radio === "meToMe" ? account.address : toAddress,
            value: 0n,
            data: stringToHex(inscription),
            ...(gas > 0
              ? gasRadio === "all"
                ? {
                  gasPrice: parseEther(gas.toString(), "gwei"),
                }
                : {
                  maxPriorityFeePerGas: parseEther(gas.toString(), "gwei"),
                }
              : {}),
          });
        }),
      );
      results.forEach((result, index) => {
        const address = handleAddress(accounts[index].address);
        if (result.status === "fulfilled") {
          pushLog(`${address} ${result.value}`, "success");
          setSuccessCount((count) => count + 1);
        }
        if (result.status === "rejected") {
          const e = result.reason as SendTransactionErrorType;
          let msg = `${e.name as string}: `;
          if (e.name === "TransactionExecutionError") {
            msg = msg + e.details;
          }
          if (e.name == "Error") {
            msg = msg + e.message;
          }
          setLogs((logs) => [handleLog(`${address} ${msg}`, "error"), ...logs]);
        }
      });
    },
    running ? delay : null,
  );

  const run = useCallback(() => {
    if (privateKeys.length === 0) {
      setLogs((logs) => [handleLog("no private key", "error"), ...logs]);
      setRunning(false);
      return;
    }

    if (radio === "manyToOne" && !toAddress) {
      setLogs((logs) => [handleLog("No address", "error"), ...logs]);
      setRunning(false);
      return;
    }

    if (!inscription) {
      setLogs((logs) => [handleLog("no inscription", "error"), ...logs]);
      setRunning(false);
      return;
    }

    setRunning(true);
  }, [inscription, privateKeys, radio, toAddress]);


  return (
    <div className=" flex flex-col gap-4">
      <div className=" flex flex-col gap-2">
        <span className="txtColor">Chain (select the chain to be inscribed):</span>
        <span className="txtColor txtColorC">链（选要打铭文的链）:</span>
        <TextField
          className="inputColor"
          select
          defaultValue="eth"
          size="small"
          disabled={running}
          onChange={(e) => {
            const text = e.target.value as ChainKey;
            setChain(inscriptionChains[text]);
          }}
        >
          {Object.entries(inscriptionChains).map(([key, chain]) => (
            <MenuItem
              key={chain.id}
              value={key}
            >
              {chain.name}
            </MenuItem>
          ))}
        </TextField>
      </div>

      <div className=" flex flex-col gap-2">
        <span className="txtColor">Private key (required, one per line):</span>
        <span className="txtColor txtColorC">私钥（必填，每行一个，带不带 0x 都行，程序会自动处理）:</span>
        <TextField
          className="inputColor"
          multiline
          minRows={2}
          size="small"
          placeholder="Private key, with or without 0x, the program will handle it automatically"
          disabled={running}
          onChange={(e) => {
            const text = e.target.value;
            const lines = text.split("\n");
            const keys = lines
              .map((line) => {
                const key = line.trim();
                if (/^[a-fA-F0-9]{64}$/.test(key)) {
                  return `0x${key}`;
                }
                if (/^0x[a-fA-F0-9]{64}$/.test(key)) {
                  return key as Hex;
                }
              })
              .filter((x) => x) as Hex[];
            setPrivateKeys(keys);
          }}
        />
      </div>

      <RadioGroup
        row
        defaultValue="meToMe"
        onChange={(e) => {
          const value = e.target.value as RadioType;
          setRadio(value);
        }}
      >
        <FormControlLabel
          className="txtColor"
          value="meToMe"
          control={<Radio />}
          label="Rotation（自转）"
          disabled={running}
        />
        <FormControlLabel
          className="txtColor"
          value="manyToOne"
          control={<Radio />}
          label="Turn one more（多转一）"
          disabled={running}
        />
      </RadioGroup>

      {radio === "manyToOne" && (
        <div className=" flex flex-col gap-2">
          <span className="txtColor">Address to whom to forward to (required):</span>
          <span className="txtColor txtColorC">转给谁的地址（必填）:</span>
          <TextField
            className="inputColor"

            size="small"
            placeholder="address"
            disabled={running}
            onChange={(e) => {
              const text = e.target.value;
              isAddress(text) && setToAddress(text);
            }}
          />
        </div>
      )}

      <div className=" flex flex-col gap-2">
        <span className="txtColor">Inscription (required, original inscription, not transcoded hexadecimal):</span>
        <span className="txtColor  txtColorC">铭文（选填，原始铭文，不是转码后的十六进制，不要输入错了，多检查下）:</span>

        <TextField
          className="inputColor"

          size="small"
          placeholder={`\n${example}`}
          disabled={running}
          onChange={(e) => {
            const text = e.target.value;
            setInscription(text.trim());
          }}
        />
      </div>

      <div className=" flex flex-col gap-2">
        <span className="txtColor">
          RPC (optional, the default public one has bottlenecks and often fails, it is best to use paid ones, either http or ws will work):
        </span>
        <span className="txtColor txtColorC">
          RPC (选填, 默认公共有瓶颈经常失败, 最好用付费的, http 或者 ws 都可以):
        </span>
        <TextField
          className="inputColor"

          size="small"
          placeholder="RPC"
          disabled={running}
          onChange={(e) => {
            const text = e.target.value;
            setRpc(text);
          }}
        />
      </div>

      <RadioGroup
        row
        defaultValue="tip"
        onChange={(e) => {
          const value = e.target.value as GasRadio;
          setGasRadio(value);
        }}
      >
        <FormControlLabel
          className="txtColor"
          value="tip"
          control={<Radio className="radio" />}
          label="Extra miner tip（额外矿工小费）"
          disabled={running}
        />
        <FormControlLabel
          className="txtColor"
          value="all"
          control={<Radio />}
          label="Total gas （总 gas）"
          disabled={running}
        />
      </RadioGroup>

      <div className=" flex flex-col gap-2">
        <span className="txtColor">{gasRadio === "tip" ? "Additional miner tip (optional):" : "Total gas (optional):"}</span>
        <span className="txtColor txtColorC">{gasRadio === "tip" ? "额外矿工小费 (选填，默认 0， 单位 gwei，例子: 10):" : "总 gas (选填，默认最新, 单位 gwei，例子: 10):"}</span>
        <TextField
          className="inputColor"

          type="number"
          size="small"
          placeholder={`${gasRadio === "tip" ? "Default 0" : "Default latest"
            }, unit example: 10`}
          disabled={running}
          onChange={(e) => {
            const num = Number(e.target.value);
            !Number.isNaN(num) && num >= 0 && setGas(num);
          }}
        />
      </div>

      <div className=" flex flex-col gap-2">
        <span className="txtColor">Interval time between each transaction (optional, minimum 0 ms):</span>
        <span className="txtColor txtColorC">每笔交易间隔时间 (选填, 最低 0 ms):</span>
        <TextField
          className="inputColor"

          type="number"
          size="small"
          placeholder="Default 0 ms"
          disabled={running}
          onChange={(e) => {
            const num = Number(e.target.value);
            !Number.isNaN(num) && num >= 0 && setDelay(num);
          }}
        />
      </div>

      <Button
        className="runBtn"
        variant="contained"
        color={running ? "error" : "success"}
        onClick={() => {
          if (!running) {
            run();
          } else {
            setRunning(false);
          }
        }}
      >
        {running ? "running（运行中）···" : "run（运行）"}


      </Button>

      <Log
        title={`Log (number of successes => ${successCount}）:`}
        txt={`日志（成功次数 => ${successCount}）:`}
        logs={logs}
        onClear={() => {
          setLogs([]);
        }}
      />
    </div>
  );
}
