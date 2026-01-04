# 🚀 Ano de 12 Semanas - Aplicativo Desktop

## Como Executar o Aplicativo

### Modo Desenvolvimento (Testar imediatamente)

```bash
npm start
```

Ou para abrir com DevTools:
```bash
npm run dev
```

### Gerar Executável (.exe)

```bash
npm run build
```

O executável será criado em: `dist\Ano de 12 Semanas Setup 1.0.0.exe`

## O Que Foi Feito

✅ **Aplicativo Desktop Completo**
- Convertido de web app para Electron
- Janela nativa sem barra de navegador
- Armazenamento em arquivo local (não depende mais de localStorage!)
- Ícone personalizado
- Configuração para gerar instalador Windows

✅ **Armazenamento de Dados**
- Os dados agora são salvos em um arquivo `data.json`
- Localização: `%APPDATA%\ano-12-semanas\data.json`
- Backup automático
- Funciona independente do navegador

✅ **Funciona Offline**
- Não precisa de internet
- Não precisa de servidor local
- Duplo clique e pronto!

## Estrutura do Projeto

```
12-week-year-app/
├── main.js          # Processo principal do Electron
├── preload.js       # Bridge segura entre renderer e main
├── index.html       # Interface do app
├── styles.css       # Estilos
├── app.js           # Lógica (adaptada para Electron)
├── package.json     # Configuração do projeto
├── assets/
│   └── icon.png     # Ícone do app
└── dist/            # Executáveis gerados (após build)
```

## Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm start` | Inicia em modo desenvolvimento |
| `npm run dev` | Inicia com DevTools aberto |
| `npm run build` | Gera instalador completo |
| `npm run build:win` | Build apenas para Windows |
| `npm run dist` | Build otimizado 64-bit |

## Diferenças da Versão Web

| Aspecto | Web | Desktop (Electron) |
|---------|-----|-------------------|
| Armazenamento | localStorage (limitado) | Arquivo JSON local |
| Abertura | Precisa navegador/servidor | Duplo clique no .exe |
| Janela | Aba do navegador | Janela dedicada |
| Instalação | Não tem | Instalador NSIS |
| Atalhos | Manual | Automático (desktop + menu) |
| Visual | Barra do navegador | Janela nativa limpa |

## Localização dos Dados

Windows: `C:\Users\<USUARIO>\AppData\Roaming\ano-12-semanas\data.json`

Você pode fazer backup simplesmente copiando este arquivo!

## Próximos Passos

1. **Teste agora**: `npm start`
2. **Crie o executável**: `npm run build`
3. **Instale e use**: Execute o instalador em `dist/`

---

**Agora você tem um aplicativo desktop de verdade!** 🎉
