document.addEventListener('DOMContentLoaded', () => {
    const file1Input = document.getElementById('file1');
    const file2Input = document.getElementById('file2');
    const mergeButton = document.getElementById('mergeButton');
    const downloadLink = document.getElementById('downloadLink');
    const outputArea = document.getElementById('output');
    const conflictResolutionDiv = document.getElementById('conflict-resolution');
    const conflictListDiv = document.getElementById('conflict-list');
    const resolveConflictButton = document.getElementById('resolveConflictButton');
    const addFileButton = document.getElementById('addFileButton');
    const additionalFilesContainer = document.getElementById('additional-files');

    let fileInputs = [];
    let data = [];
    let mergedData = [];
    let conflicts = [];
    let currentConflictIndex = 0;

    function log(message) {
        outputArea.textContent += message + '\n';
    }

    function parseCSV(file, callback) {
        log(`开始解析文件: ${file.name}`);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                log(`文件 ${file.name} 解析完成，共 ${results.data.length} 条记录。`);
                callback(results.data);
            },
            error: (error) => {
                log(`解析文件 ${file.name} 失败: ${error.message}`);
                callback([]);
            }
        });
    }

    file1Input.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            parseCSV(file, (parsedData) => {
                data1 = parsedData;
            });
        }
    });

    file2Input.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            parseCSV(file, (parsedData) => {
                data[1] = parsedData;
            });
        }
    });

    function numberToChinese(num) {
        const chineseNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
        return num <= 10 ? chineseNumbers[num - 1] : num.toString();
    }

    addFileButton.addEventListener('click', () => {
        const fileIndex = fileInputs.length + 3;
        const fileUploadDiv = document.createElement('div');
        fileUploadDiv.className = 'file-upload';
        
        const label = document.createElement('label');
        label.textContent = `选择第${numberToChinese(fileIndex)}个密码文件 (CSV):`;
        
        const input = document.createElement('input');
        input.type = 'file';
        input.id = `file${fileIndex}`;
        input.accept = '.csv';
        
        input.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                parseCSV(file, (parsedData) => {
                    data[fileIndex-1] = parsedData;
                });
            }
        });
        
        fileUploadDiv.appendChild(label);
        fileUploadDiv.appendChild(input);
        additionalFilesContainer.appendChild(fileUploadDiv);
        fileInputs.push(input);
    });

    mergeButton.addEventListener('click', () => {
        if (data1.length === 0 && data2.length === 0) {
            log('错误：请至少上传一个 CSV 文件。');
            return;
        }
        log('开始合并密码...');
        mergedData = [];
        conflicts = [];
        currentConflictIndex = 0;
        conflictListDiv.innerHTML = '';
        outputArea.textContent = ''; // 清空之前的日志

        const combinedData = [...data1, ...data2];
        const uniqueEntries = new Map();

        combinedData.forEach(entry => {
            // 确保所有必要的字段都存在，如果不存在则视为空字符串
            const name = entry.name || '';
            const url = entry.url || '';
            const username = entry.username || '';
            const password = entry.password || '';
            const note = entry.note || '';

            const key = `${name}-${url}-${username}`.toLowerCase();

            if (uniqueEntries.has(key)) {
                const existingEntry = uniqueEntries.get(key);
                if (existingEntry.password !== password) {
                    // 发现密码冲突
                    conflicts.push({
                        key: key,
                        entry1: existingEntry,
                        entry2: { name, url, username, password, note } // 确保包含所有字段
                    });
                    log(`发现冲突: Name: ${name}, URL: ${url}, Username: ${username}`);
                } else {
                    // 完全相同的条目，如果note不同，可以考虑合并或提示，这里简单覆盖
                    if(note && !existingEntry.note) existingEntry.note = note;
                    uniqueEntries.set(key, existingEntry); // 更新条目（例如，如果note不同）
                }
            } else {
                uniqueEntries.set(key, { name, url, username, password, note });
            }
        });

        // 将没有冲突的条目直接加入mergedData
        uniqueEntries.forEach((value, key) => {
            if (!conflicts.some(c => c.key === key)) {
                mergedData.push(value);
            }
        });

        if (conflicts.length > 0) {
            log(`共发现 ${conflicts.length} 个密码冲突，请解决。`);
            conflictResolutionDiv.style.display = 'block';
            displayNextConflict();
        } else {
            log('没有发现密码冲突。');
            generateCSV();
        }
    });

    function displayNextConflict() {
        if (currentConflictIndex < conflicts.length) {
            const conflict = conflicts[currentConflictIndex];
            conflictListDiv.innerHTML = `
                <div class="conflict-card">
                    <h3>密码冲突 #${currentConflictIndex + 1}/${conflicts.length}</h3>
                    <div class="conflict-details">
                        <p><strong>名称:</strong> ${conflict.entry1.name}</p>
                        <p><strong>URL:</strong> ${conflict.entry1.url}</p>
                        <p><strong>用户名:</strong> ${conflict.entry1.username}</p>
                    </div>
                    <div class="password-options">
                        <div class="password-option">
                            <label>
                                <input type="radio" name="conflict_password_${currentConflictIndex}" value="1" checked>
                                <span class="option-title">选项1</span>
                                <span class="option-password">${conflict.entry1.password}</span>
                                <span class="option-source">(来自文件1或较早条目)</span>
                            </label>
                        </div>
                        <div class="password-option">
                            <label>
                                <input type="radio" name="conflict_password_${currentConflictIndex}" value="2">
                                <span class="option-title">选项2</span>
                                <span class="option-password">${conflict.entry2.password}</span>
                                <span class="option-source">(来自文件2或较晚条目)</span>
                            </label>
                        </div>
                    </div>
                </div>
            `;
        } else {
            conflictResolutionDiv.style.display = 'none';
            log('所有冲突已解决。');
            generateCSV();
        }
    }

    resolveConflictButton.addEventListener('click', () => {
        if (currentConflictIndex < conflicts.length) {
            const conflict = conflicts[currentConflictIndex];
            const selectedValue = document.querySelector(`input[name="conflict_password_${currentConflictIndex}"]:checked`).value;

            if (selectedValue === '1') {
                mergedData.push(conflict.entry1);
                log(`冲突解决: 保留密码1 for ${conflict.entry1.name} - ${conflict.entry1.url}`);
            } else {
                mergedData.push(conflict.entry2);
                log(`冲突解决: 保留密码2 for ${conflict.entry2.name} - ${conflict.entry2.url}`);
            }
            currentConflictIndex++;
            displayNextConflict();
        }
    });

    function generateCSV() {
        if (mergedData.length === 0 && conflicts.length === 0) {
            log('没有数据可生成 CSV 文件。');
            return;
        }
        log('开始生成 CSV 文件...');
        const csv = Papa.unparse(mergedData, {
            header: true
        });
        log('CSV 文件内容已生成。');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        downloadLink.href = url;
        downloadLink.download = 'all_passwords.csv';
        downloadLink.style.display = 'block';
        downloadLink.textContent = '下载合并后的密码文件 (all_passwords.csv)';
        log('已创建下载链接。您可以点击下载。');
    }
});