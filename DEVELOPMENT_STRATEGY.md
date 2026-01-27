# Development Strategy for nightwork_bot

本ドキュメントは、プロジェクトの持続可能性とスケーラビリティを維持するための将来的な戦略方針です。

## 1. 型安全性の確保 (Priority 🥇)
- **Zodの全面採用**: 外部境界（Discord interaction, GCS, API）でのバリデーションを必須とします。
- **JSDoc + @ts-check**: TypeScript移行への中間ステップとして、主要なクラスと関数にJSDocを記述し、IDEでの型チェックを有効にします。
- **TypeScript移行**: プロジェクトが次の大きなフェーズに入る際に、TSへの完全移行を検討します。

## 2. 外部依存の完全抽象化 (Priority 🥈)
- **StorageInterface**: 本番(GCS)と開発(Local)を意識せずコードを書ける状態を維持します。
- **AsyncWrapper**: `retryWithBackoff` や `safeExecute` を通さない非同期処理（特にネットワークI/O）を禁止します。

## 3. 宣言的テンプレートの徹底 (Priority 🥉)
- **Panel Schema**: UIの変更がコード変更にならず、定義ファイルの修正（またはDB更新）のみで済む仕組みを拡張します。
- **Auto-Discovery**: `AppRouter` によるディレクトリ自動スキャンにより、ボイラープレートを最小限に抑えます。

## 5. TypeScript 移行の安全ルート (Safe Route)
1. **JSDoc化**: 全ての `Service` と `Repository` に JSDoc 型定義を付与し、`// @ts-check` でエラーを特定する。
2. **RepositoryのTS化**: 最も依存関係の下層にある `Repository` から順に `.ts` に変換する。
3. **ServiceのTS化**: ロジック層をTS化し、ユニットテストで安全性を担保する。
4. **HandlerのTS化**: 最後に Discord.js に依存する Handler 層を移行する。
5. **厳格化**: `tsconfig.json` の `strict: true` を有効化する。
