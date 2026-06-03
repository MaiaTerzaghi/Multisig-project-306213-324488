# Multisig DApp

Contrato de firma múltiple (multisig) programático desplegado en Sepolia, con interfaz React.

## Decisión de diseño

**Signers fijos**: el conjunto de signers se define en el despliegue y no se puede modificar después. Elegimos este enfoque por simplicidad y seguridad: no hay riesgo de que un signer malicioso agregue cuentas para bajar el threshold efectivo.

## Compilar y testear el contrato

```bash
npm install
npx hardhat compile
npx hardhat test
```

## Desplegar en Sepolia

1. Crear un archivo `.env` basado en `.env.example` con tu RPC URL de Alchemy y tu clave privada.
2. Ejecutar:

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

## Ejecutar el frontend

```bash
cd frontend
npm install
npm run dev
```

Abrir http://localhost:5173 en el navegador con MetaMask conectado a Sepolia.

## Contrato desplegado en Sepolia

**Dirección:** `0x1d87a2461042B2af06e0Aa433DF499ef6E56908A`

## Wallets signer

- Maia: `0xE7888BB7685842AE17F95c27494F403B7863Ce6A`
- Pilar: `0xa030aA74b0607DE3F2053d9D20F6992e1b32677f`

**Threshold:** 2 (ambas deben aprobar para ejecutar)

## Integrantes

- Maia Terzaghi
- Pilar Fraschini
