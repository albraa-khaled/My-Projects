import gymnasium as gym
import numpy as np
import random
from gymnasium.envs.toy_text.frozen_lake import FrozenLakeEnv
import os
from gymnasium.wrappers import RecordEpisodeStatistics, RecordVideo

env = FrozenLakeEnv(is_slippery=False, map_name="4x4",render_mode="rgb_array")
env = RecordVideo(env, video_folder="videos1", name_prefix="eval",episode_trigger=lambda x: x % 500 == 0)
state_size = env.observation_space.n
action_size = env.action_space.n
q_table = np.zeros((state_size, action_size))

total_episodes = 5000
learning_rate = 0.8
discount_factor = 0.95
epsilon = 1.0
max_epsilon = 1.0
min_epsilon = 0.01
decay_rate = 0.001

# ⏱ Track rewards
rewards_per_episode = []
average_rewards = []

for episode in range(total_episodes):
    state = env.reset()[0]
    done = False
    total_rewards = 0

    while not done:
        if random.uniform(0, 1) > epsilon:
            action = np.argmax(q_table[state, :])
        else:
            action = env.action_space.sample()

        new_state, reward, done, _, _ = env.step(action)

        q_table[state, action] += learning_rate * (
            reward + discount_factor * np.max(q_table[new_state, :]) - q_table[state, action]
        )

        state = new_state
        total_rewards += reward

    rewards_per_episode.append(total_rewards)

    # Exponential decay of epsilon
    epsilon = min_epsilon + (max_epsilon - min_epsilon) * np.exp(-decay_rate * episode)

    # Print progress and average reward every 500 episodes
    if episode % 500 == 0:
        avg_reward = np.mean(rewards_per_episode[-500:]) if episode >= 500 else np.mean(rewards_per_episode)
        average_rewards.append(avg_reward)
        print(f"Episode {episode}/{total_episodes} - Avg Reward (last 500): {avg_reward:.3f} - epsilon: {epsilon:.4f}")

np.save("q_table.npy", q_table)
print("✔ Q-table saved at:", os.path.abspath("q_table.npy"))
