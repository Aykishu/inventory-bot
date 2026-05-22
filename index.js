const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    Routes,
    REST,
    EmbedBuilder
} = require('discord.js');

const fs = require('fs');

const config = {
    token: process.env.TOKEN,

    clientId: "122107837739433984",
    guildId: "1507287568440627261",

    allowedRoles: [
        "Président",
        "Vice-président",
        "Sergent d'armes",
        "Trésorier",
        "Secrétaire"
    ],

    logChannelName: "📦・│stockage"
};

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

let stocks = {};

if (fs.existsSync('./stock.json')) {
    stocks = JSON.parse(fs.readFileSync('./stock.json'));
}

function saveStocks() {
    fs.writeFileSync('./stock.json', JSON.stringify(stocks, null, 2));
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
            Routes.applicationGuildCommands(
                config.clientId,
                config.guildId
            ),
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

    const hasPermission = interaction.member.roles.cache.some(
        r => config.allowedRoles.includes(r.name)
    );

    const logsChannel = interaction.guild.channels.cache.find(
        c => c.name === config.logChannelName
    );

    if (
        (
            interaction.commandName === 'ajouter' ||
            interaction.commandName === 'retirer'
        ) &&
        !hasPermission
    ) {
        return interaction.reply({
            content: '❌ Tu n’as pas la permission.',
            ephemeral: true
        });
    }

    // AJOUTER

    if (interaction.commandName === 'ajouter') {

        const objet = interaction.options.getString('objet');
        const quantite = interaction.options.getInteger('quantite');

        if (!stocks[objet]) {
            stocks[objet] = 0;
        }

        stocks[objet] += quantite;

        saveStocks();

        const embed = new EmbedBuilder()
            .setTitle('📦 Stock ajouté')
            .setDescription(
                `✅ ${quantite} ${objet} ajouté(s).\n\nStock actuel : ${stocks[objet]}`
            )
            .setColor('Green');

        await interaction.reply({
            embeds: [embed]
        });

        if (logsChannel) {
            logsChannel.send(
                `📥 ${interaction.user.username} a ajouté ${quantite} ${objet}`
            );
        }
    }

    // RETIRER

    if (interaction.commandName === 'retirer') {

        const objet = interaction.options.getString('objet');
        const quantite = interaction.options.getInteger('quantite');

        if (!stocks[objet]) {
            stocks[objet] = 0;
        }

        stocks[objet] -= quantite;

        if (stocks[objet] < 0) {
            stocks[objet] = 0;
        }

        saveStocks();

        const embed = new EmbedBuilder()
            .setTitle('📦 Stock retiré')
            .setDescription(
                `❌ ${quantite} ${objet} retiré(s).\n\nStock actuel : ${stocks[objet]}`
            )
            .setColor('Red');

        await interaction.reply({
            embeds: [embed]
        });

        if (logsChannel) {
            logsChannel.send(
                `📤 ${interaction.user.username} a retiré ${quantite} ${objet}`
            );
        }
    }

    // STOCK

    if (interaction.commandName === 'stock') {

        let description = '';

        for (const item in stocks) {
            description += `📦 **${item}** : ${stocks[item]}\n`;
        }

        if (description === '') {
            description = 'Aucun stock enregistré.';
        }

        const embed = new EmbedBuilder()
            .setTitle('📦 Inventaire')
            .setDescription(description)
            .setColor('Blue')
            .setFooter({
                text: 'Hells Legion Inventory'
            });

        await interaction.reply({
            embeds: [embed]
        });
    }
});

client.login(config.token);