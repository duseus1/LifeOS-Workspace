import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],server:{port:1420,strictPort:true},build:{rollupOptions:{output:{manualChunks(id){if(id.includes('codemirror')||id.includes('@lezer'))return 'editor';if(id.includes('react-markdown')||id.includes('remark')||id.includes('micromark')||id.includes('mdast')||id.includes('hast'))return 'markdown';}}}},clearScreen:false});
