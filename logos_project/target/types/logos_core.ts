/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/logos_core.json`.
 */
export type LogosCore = {
  "address": "Ldm2tof9CHcyaHWh3nBkwiWNGYN8rG5tex7NMbHQxG3",
  "metadata": {
    "name": "logosCore",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "logDecision",
      "docs": [
        "Logs a \"Proof of Decision\" (PoD)",
        "This stores the commitment (decision_hash) and context (objective_id)."
      ],
      "discriminator": [
        160,
        73,
        104,
        176,
        37,
        115,
        231,
        204
      ],
      "accounts": [
        {
          "name": "decisionRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  99,
                  105,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "agentAccount"
              },
              {
                "kind": "arg",
                "path": "objectiveId"
              }
            ]
          }
        },
        {
          "name": "agentAccount",
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "agentAccount"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "decisionHash",
          "type": "string"
        },
        {
          "name": "objectiveId",
          "type": "string"
        }
      ]
    },
    {
      "name": "registerAgent",
      "discriminator": [
        135,
        157,
        66,
        195,
        2,
        113,
        175,
        30
      ],
      "accounts": [
        {
          "name": "agentAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "agentAccount",
      "discriminator": [
        241,
        119,
        69,
        140,
        233,
        9,
        112,
        50
      ]
    },
    {
      "name": "decisionRecord",
      "discriminator": [
        255,
        79,
        146,
        25,
        8,
        167,
        138,
        35
      ]
    }
  ],
  "events": [
    {
      "name": "agentRegistered",
      "discriminator": [
        191,
        78,
        217,
        54,
        232,
        100,
        189,
        85
      ]
    },
    {
      "name": "decisionLogged",
      "discriminator": [
        230,
        225,
        27,
        62,
        90,
        190,
        89,
        146
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidHashLength",
      "msg": "Decision hash must be exactly 64 characters."
    }
  ],
  "types": [
    {
      "name": "agentAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "agentId",
            "type": "string"
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "agentRegistered",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "agentId",
            "type": "string"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "decisionLogged",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "objectiveId",
            "type": "string"
          },
          {
            "name": "decisionHash",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "decisionRecord",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "decisionHash",
            "type": "string"
          },
          {
            "name": "objectiveId",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
