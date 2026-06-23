# Job Marketplace - Entrega Final

Marketplace de empleos on-chain con patrón escrow, construido sobre Ethereum (Sepolia). Inspirado en ERC-8183 (Agentic Commerce Protocol). Incluye el contrato Multisig de la Entrega 2 que puede actuar como evaluador del marketplace.

## Integrantes

- Maia Terzaghi - 306213
- Pilar Fraschini - 324488

## Contratos desplegados en Sepolia

| Contrato | Dirección |
|---|---|
| JobMarketplace | `0x1ec831fe1004161Dc0F862243388BECbE2eD4ECa` |
| MockToken (mUSD) | `0x4d979a59b3443395e1179be7921C3B220b1FDae3` |
| Multisig (Entrega 2) | `0x1d87a2461042B2af06e0Aa433DF499ef6E56908A` |

## Correr los tests

```bash
npm install
npx hardhat test
```

Los tests cubren: happy path completo (crear, fondear, entregar, completar), rechazo en distintos estados, expiración con claimRefund, control de acceso, y un test de integración donde el Multisig actúa como evaluador.

## Correr el frontend localmente

```bash
cd frontend
npm install
npm run dev
```

Abrir http://localhost:5173 con MetaMask conectado a Sepolia.

## Decisiones de diseño

**Token ERC-20 inmutable**: el token de pago se define en el constructor del JobMarketplace y no se puede cambiar. Esto simplifica la lógica y evita que un cliente fondee con un token y el contrato libere otro.

**Errores personalizados**: se usan custom errors (Unauthorized, InvalidAddress, WrongStatus, etc.) en vez de strings de revert, lo cual reduce el costo de gas y da mensajes de error mas claros.

**ReentrancyGuard**: todas las funciones que mueven fondos (fund, complete, reject, claimRefund) usan el modifier nonReentrant de OpenZeppelin para prevenir ataques de reentrancy.

**claimRefund sin restricciones**: cualquier address puede llamar a claimRefund si el trabajo expiró. No tiene control de acceso ni hooks para garantizar que nunca pueda quedar bloqueada.

**SafeERC20**: se usa SafeERC20 de OpenZeppelin para las transferencias de tokens, lo que protege contra tokens ERC-20 que no siguen el estándar (no retornan bool en transfer/approve).

**Deliverables en localStorage**: el contenido de las entregas se guarda en localStorage del navegador. El proveedor almacena el texto localmente y on-chain solo queda el hash (bytes32). Es suficiente para esta entrega y evita costos de storage on-chain.

**Multisig como evaluador**: el contrato Multisig de la Entrega 2 se puede usar como evaluador de un trabajo. Cuando se asigna la dirección del Multisig como evaluador, la aprobación o rechazo requiere que los signers del Multisig alcancen el threshold y ejecuten la llamada a complete() o reject(). Esto no requiere integración adicional, surge naturalmente del protocolo.

**Signers fijos en Multisig**: el conjunto de signers se define en el despliegue y no se puede modificar después. Elegimos este enfoque por simplicidad y seguridad.

**Frontend con wagmi + RainbowKit**: migramos de ethers.js a wagmi v2 + viem + RainbowKit para el manejo de wallet y llamadas al contrato. RainbowKit maneja la conexión de billetera y wagmi provee hooks reactivos para leer/escribir en el contrato.

**Panel de cuenta (Entrega 1)**: el frontend incluye un panel que muestra la dirección conectada, saldo ETH, número de bloque actual, y balances de dos tokens ERC-20 (MockToken y LINK).

## Desvíos de la especificación

**Lectura de trabajos por getJob en vez de eventos**: el tablero lee los trabajos iterando getJobCount + getJob en lugar de leer eventos JobCreated. Ambos enfoques son válidos; elegimos lectura directa del estado porque es mas simple con wagmi y garantiza datos actualizados sin necesidad de indexar eventos.

## Wallets

- Maia: `0xE7888BB7685842AE17F95c27494F403B7863Ce6A`
- Pilar: `0xa030aA74b0607DE3F2053d9D20F6992e1b32677f`

**Threshold Multisig:** 2 (las dos tenems que aprobar para ejecutar)
