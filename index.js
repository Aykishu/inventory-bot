const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    Routes,
    REST,
    EmbedBuilder
} = require('discord.js');

const fs = require('fs');

const config = require('./config.json');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

let stocks = {};

if (fs.existsSync('./stocks.json')) {
    stocks = JSON.parse(fs.readFileSync('./stocks.json'));
}

function saveStocks() {
    fs.writeFileSync('./stocks.json', JSON.stringify(stocks, null, 2));
}

const commands = [
    new SlashCommandBuilder()
        .setName('ajouter')
        .setDescription('Ajouter du stock')
        .addStringOption(option =>
            option.setName('objet')
                .setDescription('Nom de l’objet')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('quantite')
                .setDescription('Quantité')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('retirer')
        .setDescription('Retirer du stock')
        .addStringOption(option =>
            option.setName('objet')
                .setDescription('Nom de l’objet')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('quantite')
                .setDescription('Quantité')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('stock')
        .setDescription('Voir les stocks')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands }
        );

        console.log('Commandes enregistrées.');
    } catch (error) {
        console.error(error);
    }
})();

client.once('ready', () => {
    console.log(`${client.user.tag} est en ligne.`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const role = interaction.member.roles.cache.find(
        r => r.name === config.allowedRole
    );

    const logsChannel = interaction.guild.channels.cache.find(
        c => c.name === config.logChannelName
    );

    if (
        (interaction.commandName === 'ajouter' ||
         interaction.commandName === 'retirer') &&
        !role
    ) {
        return interaction.reply({
            content: '❌ Tu n’as pas la permission.',
            ephemeral: true
        });
    }

    if (interaction.commandName === 'ajouter') {

        const objet = interaction.options.getString('objet');
        const quantite = interaction.options.getInteger('quantite');

        if (!stocks[objet]) stocks[objet] = 0;

        stocks[objet] += quantite;

        saveStocks();

        const embed = new EmbedBuilder()
            .setTitle('📦 Stock ajouté')
            .setDescription(`${quantite} ${objet} ajouté(s).`)
            .setColor('Green');

        interaction.reply({ embeds: [embed] });

        if (logsChannel) {
            logsChannel.send(
                `📥 ${interaction.user.username} a ajouté ${quantite} ${objet}`
            );
        }
    }

    if (interaction.commandName === 'retirer') {

        const objet = interaction.options.getString('objet');
        const quantite = interaction.options.getInteger('quantite');

        if (!stocks[objet]) stocks[objet] = 0;

        stocks[objet] -= quantite;

        if (stocks[objet] < 0) {
            stocks[objet] = 0;
        }

        saveStocks();

        const embed = new EmbedBuilder()
            .setTitle('📦 Stock retiré')
            .setDescription(`${quantite} ${objet} retiré(s).`)
            .setColor('Red');

        interaction.reply({ embeds: [embed] });

        if (logsChannel) {
            logsChannel.send(
                `📤 ${interaction.user.username} a retiré ${quantite} ${objet}`
            );
        }
    }

    if (interaction.commandName === 'stock') {

        let description = '';

        for (const item in stocks) {
            description += `**${item}** : ${stocks[item]}\n`;
        }

        if (description === '') {
            description = 'Aucun stock.';
        }

        const embed = new EmbedBuilder()
            .setTitle('📦 Inventaire')
            .setDescription(description)
            .setColor('Blue');

        interaction.reply({ embeds: [embed] });
    }
});

client.login(config.token);