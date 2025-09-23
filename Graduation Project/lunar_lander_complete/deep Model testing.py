import gymnasium as gym
import torch
import numpy as np
from gymnasium.wrappers import RecordEpisodeStatistics, RecordVideo
import matplotlib.pyplot as plt
# Define the DQN model (must match the one used in training)
class DQN(torch.nn.Module):
    def __init__(self, state_size=8, action_size=4, hidden_size=64):
        super(DQN, self).__init__()
        self.layer1 = torch.nn.Linear(state_size, hidden_size)
        self.layer2 = torch.nn.Linear(hidden_size, hidden_size)
        self.layer3 = torch.nn.Linear(hidden_size, action_size)

    def forward(self, state):
        x = torch.relu(self.layer1(state))
        x = torch.relu(self.layer2(x))
        return self.layer3(x)

# Define the Agent
class DQNAgent:
    def __init__(self, state_size=8, action_size=4, hidden_size=64):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.q_network = DQN(state_size, action_size, hidden_size).to(self.device)
        self.q_network.load_state_dict(torch.load("dqn_lunar_lander.pth", map_location=self.device))
        self.q_network.eval()

    def act(self, state):
        state = torch.from_numpy(state).float().unsqueeze(0).to(self.device)
        with torch.no_grad():
            action_values = self.q_network(state)
        return np.argmax(action_values.cpu().data.numpy())

# Create the environment with rendering
env = gym.make("LunarLander-v3",)
#env = RecordVideo(env, video_folder="videos", name_prefix="eval",episode_trigger=lambda x: True)
#env = RecordEpisodeStatistics(env, buffer_length=10)
agent = DQNAgent()
test_rewards = []
# Function to test the agent
def test_agent(n_episodes=100):
    for i_episode in range(n_episodes):
        state, _ = env.reset()
        total_reward = 0
        while True:
            env.render()  # Render the environment
            action = agent.act(state)
            next_state, reward, terminated, truncated, _ = env.step(action)
            total_reward += reward
            state = next_state
            if terminated or truncated:
                break
        print(f"Episode {i_episode + 1}: Total Reward = {total_reward:.2f}")
        test_rewards.append(total_reward)

    env.close()
    print(f"Average Reward over {n_episodes} episodes: {np.mean(test_rewards):.2f}")
    return test_rewards

# Run the test
test_rewards=test_agent()
def moving_average(data, window_size=40):
    return np.convolve(data, np.ones(window_size)/window_size, mode='valid')
plt.plot(moving_average(test_rewards, 40), label='Test Rewards')
plt.legend()
plt.xlabel('Episode')
plt.ylabel('Total Reward')
plt.title('Rewards per Episode during Testing(Lunar Lander)')
plt.grid()
#plt.savefig('test_rewards.png')
plt.show()