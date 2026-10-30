const MOVES = {
  rock: {label:'Rock', icon:'✊'}, paper:{label:'Paper',icon:'✋'}, scissors:{label:'Scissors',icon:'✌️'},
  lizard:{label:'Lizard',icon:'🤏'}, spock:{label:'Spock',icon:'🖖'}
};
const $ = (id) => document.getElementById(id);
let playerScore = 0, computerScore = 0, rounds = 0, busy = false, stream = null;
const buttons = [...document.querySelectorAll('.move-btn')];

function setBusy(value) { busy = value; buttons.forEach(button => button.disabled = value); }
function showMove(element, move, waiting=false) {
  if (waiting) { element.innerHTML = '<span>…</span><small>ĐANG TÍNH...</small>'; return; }
  if (!move || !MOVES[move]) { element.innerHTML = '<span>❔</span><small>CHƯA CÓ LỰA CHỌN</small>'; return; }
  element.innerHTML = `<span>${MOVES[move].icon}</span><small>${MOVES[move].label.toUpperCase()}</small>`;
}
function showResult(outcome, computer) {
  const title = $('resultTitle');
  title.className = 'result-line ' + outcome;
  if (outcome === 'win') title.textContent = 'Bạn thắng lượt này!';
  else if (outcome === 'lose') title.textContent = 'Máy thắng lượt này!';
  else title.textContent = 'Hòa! Hai bên giống nhau.';
  $('resultDetail').textContent = `Máy chọn ${MOVES[computer].label}. ${outcome === 'win' ? 'Quá tốt!' : outcome === 'lose' ? 'Thử lại lượt sau nhé.' : 'Chưa ai ghi điểm.'}`;
}
async function play(move) {
  if (busy) return;
  setBusy(true); showMove($('playerDisplay'), move); showMove($('computerDisplay'), null, true);
  $('resultTitle').className = 'result-line'; $('resultTitle').textContent = 'Đang chờ nước đi của máy...';
  try {
    const response = await fetch('/api/round', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({player_move:move})});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Không thể chơi lượt này.');
    showMove($('computerDisplay'), data.computer);
    rounds++;
    if (data.outcome === 'win') playerScore++;
    if (data.outcome === 'lose') computerScore++;
    $('playerScore').textContent = playerScore; $('computerScore').textContent = computerScore;
    $('roundCount').textContent = `ROUND ${String(rounds).padStart(2,'0')}`;
    showResult(data.outcome, data.computer);
    $('resultDetail').textContent += ` Nguồn số: ${data.rng_source}.`;
    if (playerScore >= 5 || computerScore >= 5) {
      $('resultTitle').textContent = playerScore >= 5 ? '🏆 BẠN ĐÃ CHIẾN THẮNG!' : '🤖 MÁY ĐÃ CHIẾN THẮNG!';
      $('resultDetail').textContent = 'Trận đấu kết thúc ở mốc 5 điểm. Nhấn “Chơi lại” để bắt đầu trận mới.';
      setBusy(true); return;
    }
  } catch (error) {
    $('resultTitle').textContent = 'Có lỗi xảy ra'; $('resultDetail').textContent = error.message;
    showMove($('computerDisplay'), null);
  } finally { if (playerScore < 5 && computerScore < 5) setBusy(false); }
}
buttons.forEach(button => button.addEventListener('click', () => play(button.dataset.move)));
$('resetGame').addEventListener('click', () => {
  playerScore = 0; computerScore = 0; rounds = 0; setBusy(false);
  $('playerScore').textContent = '0'; $('computerScore').textContent = '0'; $('roundCount').textContent = 'ROUND 00';
  showMove($('playerDisplay'), null); showMove($('computerDisplay'), null);
  $('resultTitle').className = 'result-line'; $('resultTitle').textContent = 'Sẵn sàng chưa?'; $('resultDetail').textContent = 'Chọn nước đi đầu tiên để bắt đầu trận đấu.';
});

async function checkStatus() {
  try {
    const response = await fetch('/api/status'); const status = await response.json();
    $('connection').classList.add('online');
    $('connection').innerHTML = '<i></i> MÁY CHỦ ĐÃ KẾT NỐI';
    $('cameraNote').textContent = status.tensorflow_model ? 'Model TensorFlow đã sẵn sàng.' : 'Chế độ demo: chọn tay. ' + status.tensorflow_message;
    if (!status.qiskit) $('resultDetail').textContent = 'Lưu ý: Qiskit chưa khả dụng trên máy chủ; hệ thống sẽ dùng bộ sinh số ngẫu nhiên dự phòng.';
  } catch {
    $('connection').innerHTML = '<i></i> KHÔNG KẾT NỐI ĐƯỢC';
    $('cameraNote').textContent = 'Không kết nối được backend. Hãy tải lại trang sau khi máy chủ hoạt động.';
  }
}
$('cameraStart').addEventListener('click', async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
    $('camera').srcObject = stream; document.querySelector('.camera-frame').classList.add('active');
    $('cameraStart').disabled = true; $('cameraStop').disabled = false; $('cameraCapture').disabled = false;
    $('cameraNote').textContent = 'Webcam đang hoạt động. Có thể chụp ảnh để gửi đến model khi model được cài.';
  } catch (error) { $('cameraNote').textContent = 'Không mở được webcam: ' + error.message + '. Hãy kiểm tra quyền camera và dùng HTTPS.'; }
});
function stopCamera() {
  if (stream) stream.getTracks().forEach(track => track.stop()); stream = null;
  $('camera').srcObject = null; document.querySelector('.camera-frame').classList.remove('active');
  $('cameraStart').disabled = false; $('cameraStop').disabled = true; $('cameraCapture').disabled = true;
  $('cameraNote').textContent = 'Camera đã tắt.';
}
$('cameraStop').addEventListener('click', stopCamera);
$('cameraCapture').addEventListener('click', async () => {
  const video = $('camera'); if (!video.videoWidth) return;
  const canvas = $('snapshot'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  const context = canvas.getContext('2d'); context.translate(canvas.width,0); context.scale(-1,1); context.drawImage(video,0,0);
  canvas.toBlob(async blob => {
    const form = new FormData(); form.append('image',blob,'webcam.jpg');
    $('cameraNote').textContent = 'Đang gửi ảnh để nhận diện...';
    try {
      const response = await fetch('/api/classify',{method:'POST',body:form}); const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không nhận diện được.');
      $('cameraNote').textContent = `Nhận diện: ${MOVES[data.move].label} (${Math.round(data.confidence*100)}%). Nhấn cử chỉ tương ứng để chơi.`;
      const matching = buttons.find(button => button.dataset.move === data.move);
      matching?.classList.add('detected'); setTimeout(() => matching?.classList.remove('detected'),1200);
    } catch (error) { $('cameraNote').textContent = error.message; }
  },'image/jpeg',.9);
});
window.addEventListener('beforeunload', stopCamera);
checkStatus();
