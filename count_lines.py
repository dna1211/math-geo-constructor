from pathlib import Path

def count_lines_with_exclude(root_dir, extensions, exclude_dirs):
    """
    root_dir: 文件夹路径
    extensions: 需要统计的后缀列表 (如 ['.py', '.vue'])
    exclude_dirs: 需要排除的文件夹名称集合 (如 {'node_modules', 'venv', '.git'})
    """
    total_lines = 0
    stats = {ext: 0 for ext in extensions}
    
    path = Path(root_dir)
    
    # 遍历所有指定后缀的文件
    for ext in extensions:
        for file_path in path.rglob(f"*{ext}"):
            # --- 核心修改：检查路径分量中是否包含排除列表中的文件夹 ---
            # file_path.parts 会返回路径的每一级目录名，如 ('project', 'node_modules', 'lib', 'main.js')
            if any(ex_dir in file_path.parts for ex_dir in exclude_dirs):
                continue
            
            try:
                with file_path.open('r', encoding='utf-8') as f:
                    count = sum(1 for line in f)
                    stats[ext] += count
                    total_lines += count
            except Exception as e:
                print(f"跳过文件 {file_path}: {e}")

    return total_lines, stats

# --- 使用示例 ---
if __name__ == "__main__":
    PROJECT_PATH = "./" 
    TARGET_EXTS = ['.cs', '.vue', '.ts', '.js', '.html', '.css','.sql', '.json']
    # 定义要排除的文件夹
    EXCLUDE_DIRS = {'node_modules', '.git', 'venv', '__pycache__', 'dist', 'bin', 'obj', 'VotingSystem.Tests'}
    
    total, detail = count_lines_with_exclude(PROJECT_PATH, TARGET_EXTS, EXCLUDE_DIRS)
    
    print(f"统计结果（已排除 {EXCLUDE_DIRS}）：")
    print("-" * 60)
    for ext, count in detail.items():
        print(f"{ext.ljust(6)} : {count} 行")
    print("-" * 60)
    print(f"总计   : {total} 行")