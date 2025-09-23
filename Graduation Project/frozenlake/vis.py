import pygame
import numpy as np
import time

# تحميل Q-table المدربة
q_table = np.load("q_table.npy")

# خريطة البحيرة
lake_map = [
    "SFFF",
    "FHFH",
    "FFFH",
    "HFFG"
]

# إعدادات الرسم
CELL_SIZE = 100
GRID_SIZE = 4
WIDTH = HEIGHT = CELL_SIZE * GRID_SIZE

# ألوان
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
BLUE = (0, 120, 255)     # المسار الذي سار عليه الوكيل
GREEN = (0, 200, 0)      # الهدف
RED = (200, 0, 0)        # موقع الوكيل الحالي
GRAY = (160, 160, 160)   # حدود الخلايا

# استخراج مواقع الحفر والهدف والبداية
holes = []
goal = None
start = None
for i, row in enumerate(lake_map):
    for j, cell in enumerate(row):
        idx = i * GRID_SIZE + j
        if cell == 'H':
            holes.append(idx)
        elif cell == 'G':
            goal = idx
        elif cell == 'S':
            start = idx

# رسم الشبكة
def draw_grid(screen, agent_pos, path=[]):
    for i in range(GRID_SIZE):
        for j in range(GRID_SIZE):
            idx = i * GRID_SIZE + j
            rect = pygame.Rect(j*CELL_SIZE, i*CELL_SIZE, CELL_SIZE, CELL_SIZE)

            if idx in holes:
                color = BLACK
            elif idx == goal:
                color = GREEN
            elif idx == agent_pos:
                color = RED
            elif idx in path:
                color = BLUE
            else:
                color = WHITE

            pygame.draw.rect(screen, color, rect)
            pygame.draw.rect(screen, GRAY, rect, 2)

# تحويل حالة إلى إحداثيات
def get_coords(state):
    return (state // GRID_SIZE, state % GRID_SIZE)

# تحويل إحداثيات إلى حالة
def get_state(row, col):
    return row * GRID_SIZE + col

# تشغيل الوكيل ضمن النافذة
def run_agent():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Frozen Lake Agent Visualization")

    running = True
    state = start
    path = []

    draw_grid(screen, state, path)
    pygame.display.flip()
    time.sleep(1)

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        path.append(state)

        # اختيار أفضل إجراء من Q-table
        action = np.argmax(q_table[state])
        row, col = get_coords(state)

        # تنفيذ الحركة بناءً على الإجراء
        if action == 0 and col > 0:           # يسار
            col -= 1
        elif action == 1 and row < GRID_SIZE - 1:  # أسفل
            row += 1
        elif action == 2 and col < GRID_SIZE - 1:  # يمين
            col += 1
        elif action == 3 and row > 0:         # أعلى
            row -= 1

        new_state = get_state(row, col)
        state = new_state

        # تحديث العرض
        draw_grid(screen, state, path)
        pygame.display.flip()
        time.sleep(0.5)

        # التحقق من نهاية الحلقة
        if state in holes or state == goal:
            time.sleep(1.5)
            running = False

    pygame.quit()

if __name__ == "__main__":
    run_agent()
