export default {
    isDebug: process.env.NODE_ENV === 'development' || process.argv.includes('-d') || process.argv.includes('--debug'),
};