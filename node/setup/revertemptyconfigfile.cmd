FOR /F "USEBACKQ" %%F IN (`git rev-parse --show-toplevel`) DO (
    git checkout HEAD -- ..\common\config.empty.json
)